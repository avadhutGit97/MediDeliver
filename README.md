# MedDeliver

This is a small demo app that simulates uploading a prescription image, running OCR/analysis, and letting the user verify extracted prescription data.

What I changed in this copy

- Fixed malformed HTML (head/body) so scripts and inputs attach correctly.
- Moved drag/drop and file input handler setup into a DOMContentLoaded `initUI()` so handlers attach reliably.
- Improved the image-content heuristic to sample pixels (faster and less likely to false-negative).
- Added client-side OCR using Tesseract.js (browser) as a lightweight keyword check to avoid treating non-prescription images as prescriptions.
- Added an OCR debug panel (`#ocrDebug`) that displays raw OCR text after analysis for easier troubleshooting.

How OCR is used

- First, the image is checked visually for text-like characteristics (contrast + variance + filesize + dimensions).
- If the image looks like it contains text, the app attempts to run Tesseract.js in the browser.
- The OCR result text is checked for prescription-specific keywords (e.g., "rx", "doctor", "prescription", "mg", "tablet", "capsule", "dose").
- Only if these keywords are found will the app treat the upload as a prescription and populate the verification form (currently with simulated data).

Notes about testing locally

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox). Double-clicking the file should work for client-side testing.
2. Enter a valid ZIP code (for the demo try `10001`), then upload an image and click "Analyze".
3. After analysis, go to "Verify" (Step 2). If OCR ran, the raw OCR text will be shown in the "OCR Debug Output" panel below the AI notes.

Limitations and next steps

- Tesseract.js runs in the browser and can be slow for large images. For production or handwriting-heavy prescriptions use a server-side OCR (Google Vision, AWS Textract, Azure Read), which generally provides better accuracy and can be combined with ML-based extraction.
- The current extraction (`extractPrescriptionData`) is simulated and returns fake but realistic data. To extract real structured data, parse the OCR text with regexes/NER or send it to a backend model.
- Privacy/Compliance: If you process real patient prescriptions, ensure your architecture and third-party services are HIPAA-compliant.

How I recommend you verify OCR works

- Upload a clear prescription photo and check the OCR Debug panel for expected text (drug names, mg, directions, doctor name, etc.).
- Upload a non-prescription sign (like the "break msg" image). The OCR Debug panel will show the text; the app should NOT auto-fill prescription data unless keywords are present.

If you want, I can:
- Add a toggle to require OCR-only (strict mode).
- Integrate Tesseract parsing rules to extract dates, RX# patterns, and medicine lines.
- Add a small sample-images folder and unit test harness for tuning detection thresholds.

---

Generated on March 8, 2026
