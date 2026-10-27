"""Generates 5 sample medical PDFs for manually testing the upload -> AI
pipeline in the browser. Content is written to actually classify and extract
correctly under AI_PROVIDER=rule_based (the project default, no API key
needed) — real test data, not a mockup.

Usage: python scripts/generate_sample_pdfs.py [output_dir]
"""
import sys
from pathlib import Path

from reportlab.pdfgen import canvas

OUT_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else "../sample_documents")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def make_pdf(filename: str, lines: list[str]) -> None:
    path = OUT_DIR / filename
    c = canvas.Canvas(str(path), pagesize=(612, 792))
    y = 740
    for line in lines:
        if line == "":
            y -= 10
            continue
        c.drawString(50, y, line)
        y -= 20
    c.save()
    print(f"Wrote {path}")


make_pdf(
    "1_lab_report.pdf",
    [
        "City Diagnostics Laboratory",
        "Pathology Report",
        "",
        "Patient Name: Rohan Verma",
        "Doctor: Dr. Anjali Mehta",
        "Laboratory: City Diagnostics Lab",
        "Report Date: 20/09/2026",
        "",
        "Specimen: Venous blood, collected fasting",
        "Reference Range provided alongside each result.",
        "",
        "HbA1c 7.8 % (4.0-5.6)",
        "Glucose 162 mg/dL (70-110)",
        "Hemoglobin 12.5 g/dL (13.0-17.0)",
        "Cholesterol 215 mg/dL (125-200)",
    ],
)

make_pdf(
    "2_prescription.pdf",
    [
        "Dr. Anjali Mehta Clinic",
        "Prescription",
        "",
        "Patient: Rohan Verma",
        "Doctor: Dr. Anjali Mehta",
        "Date: 18/09/2026",
        "",
        "Rx:",
        "Metformin 500 mg twice daily for 90 days",
        "Atorvastatin 10 mg once daily for 90 days",
        "Sig: Take with food, avoid alcohol",
        "",
        "Take orally as directed. Review after 3 months.",
    ],
)

make_pdf(
    "3_hospital_bill.pdf",
    [
        "Apollo Hospital",
        "Hospital Bill / Invoice",
        "",
        "Patient Name: Rohan Verma",
        "Hospital: Apollo Hospital",
        "Bill No: INV-2026-4521",
        "Bill Date: 14/09/2026",
        "",
        "Amount: 18500",
        "GST: 925",
        "Total Amount: Rs. 19425",
        "Insurance Covered: 10000",
        "Patient Payable: 9425",
        "",
        "Thank you for choosing Apollo Hospital.",
    ],
)

make_pdf(
    "4_diagnosis_report.pdf",
    [
        "Metro Clinic",
        "Clinical Diagnosis Report",
        "",
        "Patient: Rohan Verma",
        "Doctor: Dr. Sanjay Rao",
        "Date: 10/09/2026",
        "",
        "Diagnosis: Type 2 Diabetes Mellitus",
        "Impression: Patient diagnosed with early-stage hypertension as well.",
        "",
        "Notes: Advised lifestyle modification and follow-up in 3 months.",
    ],
)

make_pdf(
    "5_discharge_summary.pdf",
    [
        "Apollo Hospital",
        "Discharge Summary",
        "",
        "Patient Name: Rohan Verma",
        "Doctor: Dr. Anjali Mehta",
        "Hospital: Apollo Hospital",
        "Date: 09/09/2026",
        "Admission Date: 05/09/2026",
        "Discharge Date: 09/09/2026",
        "",
        "The patient was admitted for observation following chest pain and",
        "was discharged on 09/09/2026 in stable condition.",
        "Follow-up advised after 2 weeks.",
    ],
)

print("\nDone. 5 PDFs generated.")
