"""Small regex helpers shared by the rule-based extraction provider.

These are deliberately simple pattern matches, not a real NLP pipeline — good
enough to make the rule_based AI_PROVIDER produce something useful out of the
box, and a clear seam to replace with a real LLM provider for production.
"""
import re
from datetime import date, datetime
from typing import Optional

_LABEL_VALUE_RE = re.compile(r"^\s*{label}\s*[:\-]\s*(.+)$", re.IGNORECASE | re.MULTILINE)

_DATE_PATTERNS = [
    "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%d %B %Y",
    "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%y", "%d-%b-%Y",
]

_DOSAGE_UNIT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|iu|units?)\b", re.IGNORECASE)
_FREQUENCY_KEYWORDS = re.compile(
    r"\b(once daily|twice daily|thrice daily|four times daily|OD|BD|BID|TDS|TID|QID|"
    r"once a day|twice a day|every \d+ hours?|at bedtime|as needed|SOS)\b",
    re.IGNORECASE,
)
_DURATION_RE = re.compile(r"(\d+)\s*(day|days|week|weeks|month|months)\b", re.IGNORECASE)

_AMOUNT_RE_TEMPLATE = r"{label}[:\s\-]*\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{{1,2}})?)"


def find_label_value(text: str, labels: list[str]) -> Optional[str]:
    for label in labels:
        pattern = re.compile(rf"^\s*{re.escape(label)}\s*[:\-]\s*(.+)$", re.IGNORECASE | re.MULTILINE)
        m = pattern.search(text)
        if m:
            return m.group(1).strip()
    return None


def find_amount(text: str, labels: list[str]) -> Optional[float]:
    for label in labels:
        pattern = re.compile(_AMOUNT_RE_TEMPLATE.format(label=re.escape(label)), re.IGNORECASE)
        m = pattern.search(text)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def parse_date(raw: Optional[str]) -> Optional[date]:
    if not raw:
        return None
    raw = raw.strip()
    # try an embedded date if the value has trailing text
    m = re.search(r"(\d{1,2}[\/\-\s][A-Za-z0-9]{1,9}[\/\-\s]\d{2,4}|\d{4}-\d{2}-\d{2})", raw)
    candidate = m.group(1) if m else raw
    for fmt in _DATE_PATTERNS:
        try:
            return datetime.strptime(candidate, fmt).date()
        except ValueError:
            continue
    return None


def extract_medicine_lines(text: str) -> list[dict]:
    """Best-effort: a line is treated as a medicine entry if it contains a
    dosage (e.g. '500 mg'). The leading words before the dosage are taken as
    the medicine name.
    """
    medicines = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        dosage_match = _DOSAGE_UNIT_RE.search(line)
        if not dosage_match:
            continue
        name = line[: dosage_match.start()].strip(" -:\t")
        if not name or len(name) > 80:
            continue
        freq_match = _FREQUENCY_KEYWORDS.search(line)
        duration_match = _DURATION_RE.search(line)
        medicines.append(
            {
                "medicine_name": name,
                "dosage": f"{dosage_match.group(1)} {dosage_match.group(2)}",
                "frequency": freq_match.group(0) if freq_match else None,
                "duration": duration_match.group(0) if duration_match else None,
                "instructions": None,
            }
        )
    return medicines


_LAB_RESULT_RE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9 /\-%]{2,40}?)\s{1,}"
    r"(?P<value>\d+(?:\.\d+)?)\s*"
    r"(?P<unit>%|mg/dL|g/dL|mmol/L|IU/L|U/L|/µL|/uL|mIU/L|ng/mL|pg/mL|cells/cumm|mm/hr|meq/l)?\s*"
    r"(?:\(?(?P<range_low>\d+(?:\.\d+)?)\s*-\s*(?P<range_high>\d+(?:\.\d+)?)\)?)?",
    re.IGNORECASE,
)


def extract_lab_result_lines(text: str) -> list[dict]:
    results = []
    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) > 160:
            continue
        m = _LAB_RESULT_RE.match(line)
        if not m:
            continue
        results.append(
            {
                "test_name": m.group("name").strip(),
                "result": m.group("value"),
                "unit": m.group("unit"),
                "reference_range": (
                    f"{m.group('range_low')}-{m.group('range_high')}"
                    if m.group("range_low") and m.group("range_high")
                    else None
                ),
            }
        )
    return results
