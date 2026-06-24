from __future__ import annotations

import io
import json
import os
import re
from email import policy
from email.parser import BytesParser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pandas as pd


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "web"
CONFIG_PATH = ROOT / "config" / "government_groups.json"
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8123"))

PREFERRED_SHEETS = [
    "טיוב סופי",
    "נתונים גולמיים לא מטויבים",
]

EXPECTED_COLUMNS = {
    "תאריך תחילה": "start_date",
    "תאריך סיום": "end_date",
    "תחום הכשרה": "training_field",
    "שם מוסד אחיד": "institution_name",
    "מוסד הכשרה": "training_site",
    "עיר": "city",
    "מחוז": "district",
    "מספר סטודנטים": "students",
    "שנה": "school_year",
    "מוסד אקדמי": "academic_institution",
    "סיווג חדש": "category",
    "תת סייוג חדש": "sub_category",
    "תת סיווג חדש": "sub_category",
}


def load_groups() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {"groups": []}
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    replacements = {
        "קריית": "קרית",
        "מועצה אזורית": "מ.א",
        "מ. א ": "מ.א ",
        "ב\"ש": "באר שבע",
    }
    for src, target in replacements.items():
        text = text.replace(src, target)
    return text


def coerce_date(value: Any) -> str:
    if pd.isna(value):
        return ""
    parsed = pd.to_datetime(value, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return normalize_text(value)
    return parsed.strftime("%Y-%m-%d")


def choose_sheet(sheet_names: list[str]) -> str:
    for candidate in PREFERRED_SHEETS:
        if candidate in sheet_names:
            return candidate
    return sheet_names[0]


def compute_geo_group(city: str, district: str, groups: list[dict[str, Any]]) -> list[str]:
    matches: list[str] = []
    normalized_city = normalize_text(city)
    normalized_district = normalize_text(district)
    for group in groups:
        cities = {normalize_text(item) for item in group.get("cities", [])}
        districts = {normalize_text(item) for item in group.get("districts", [])}
        if normalized_city and normalized_city in cities:
            matches.append(group["id"])
            continue
        if normalized_district and normalized_district in districts:
            matches.append(group["id"])
    return matches


def parse_excel(file_bytes: bytes) -> dict[str, Any]:
    workbook = pd.ExcelFile(io.BytesIO(file_bytes))
    sheet_name = choose_sheet(workbook.sheet_names)
    raw_df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name)
    raw_df = raw_df.rename(columns={col: col.strip() if isinstance(col, str) else col for col in raw_df.columns})

    mapped_columns: dict[str, str] = {}
    for source_name, target_name in EXPECTED_COLUMNS.items():
        if source_name in raw_df.columns:
            mapped_columns[source_name] = target_name

    df = raw_df.rename(columns=mapped_columns)
    required_targets = {
        "training_field",
        "city",
        "district",
        "students",
        "school_year",
        "academic_institution",
        "category",
        "sub_category",
    }
    missing_targets = [name for name in required_targets if name not in df.columns]
    if missing_targets:
        raise ValueError(f"חסרות עמודות נדרשות בקובץ: {', '.join(sorted(missing_targets))}")

    for column in ["training_field", "institution_name", "training_site", "city", "district", "school_year", "academic_institution", "category", "sub_category"]:
        if column in df.columns:
            df[column] = df[column].map(normalize_text)

    df["students"] = pd.to_numeric(df["students"], errors="coerce").fillna(0).astype(int)
    if "start_date" in df.columns:
        df["start_date"] = df["start_date"].map(coerce_date)
    if "end_date" in df.columns:
        df["end_date"] = df["end_date"].map(coerce_date)

    df = df.fillna("")
    df = df[df["students"] > 0].copy()

    groups_config = load_groups()
    groups = groups_config.get("groups", [])
    df["geo_groups"] = df.apply(
        lambda row: compute_geo_group(row.get("city", ""), row.get("district", ""), groups),
        axis=1,
    )

    records = df.to_dict(orient="records")
    return {
        "sheetName": sheet_name,
        "availableSheets": workbook.sheet_names,
        "rowCount": len(records),
        "groups": groups,
        "records": records,
        "sourceNotes": groups_config.get("sourceNotes", []),
    }


def json_response(handler: SimpleHTTPRequestHandler, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def parse_multipart_file(handler: SimpleHTTPRequestHandler, field_name: str) -> bytes:
    content_length = int(handler.headers.get("Content-Length", "0"))
    content_type = handler.headers.get("Content-Type", "")
    if not content_length or "multipart/form-data" not in content_type:
        raise ValueError("Expected multipart/form-data")

    raw_body = handler.rfile.read(content_length)
    parser = BytesParser(policy=policy.default)
    message = parser.parsebytes(
        b"Content-Type: " + content_type.encode("utf-8") + b"\r\n\r\n" + raw_body
    )

    for part in message.iter_parts():
        if part.get_param("name", header="content-disposition") != field_name:
            continue
        payload = part.get_payload(decode=True)
        if payload is None:
            raise ValueError("לא התקבל תוכן בקובץ")
        return payload

    raise ValueError("לא התקבל קובץ אקסל")


class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            json_response(self, {"ok": True})
            return
        return super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/upload":
            json_response(self, {"error": "Unsupported endpoint"}, HTTPStatus.NOT_FOUND)
            return

        try:
            upload_bytes = parse_multipart_file(self, "excel")
            payload = parse_excel(upload_bytes)
        except Exception as exc:  # noqa: BLE001
            json_response(self, {"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        json_response(self, payload)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), DashboardHandler)
    print(f"Dashboard available at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
