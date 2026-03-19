 // State Management
        let currentStep = 1;
        let prescriptionData = {
            image: null,
            imageDataUrl: null,
            medicines: [],
            pharmacy: null,
            zipCode: null,
            extractedData: null,
            analysisSuccess: false,
            forceOcr: false,
            autoFill: true,
            currentMedicineSuggestions: []
        };

        // Service Area ZIP codes (example)
        const serviceZipCodes = ['10001', '10002', '10003', '90210', '90211', '60601', '60602', '77001', '77002'];

        // Drag and Drop and UI initialization will be attached after DOM is ready
        // to ensure all elements exist. See initUI() below.

        // Initialize UI event handlers (attach after DOM ready)
        function initUI() {
            const uploadArea = document.getElementById('uploadArea');
            const prescriptionInput = document.getElementById('prescriptionInput');
            const dragOverlay = document.getElementById('dragOverlay');
            const forceOcrToggle = document.getElementById('forceOcrToggle');

            if (!uploadArea || !prescriptionInput) return;

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('drag-active');
                    if (dragOverlay) {
                        dragOverlay.classList.remove('hidden');
                        dragOverlay.classList.add('flex');
                    }
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('drag-active');
                    if (dragOverlay) {
                        dragOverlay.classList.add('hidden');
                        dragOverlay.classList.remove('flex');
                    }
                }, false);
            });

            uploadArea.addEventListener('drop', handleDrop, false);
            uploadArea.addEventListener('click', (e) => {
                // Only open file picker if the user clicked the upload area itself,
                // not when they click child controls like Analyze or Retake inside the preview.
                if (e.target === uploadArea) prescriptionInput.click();
            });

            // Also attach change handler defensively (HTML has onchange inline)
            prescriptionInput.addEventListener('change', handleFileSelect);

            if (forceOcrToggle) {
                forceOcrToggle.addEventListener('change', (e) => {
                    prescriptionData.forceOcr = !!e.target.checked;
                });
            }
            // Wire auto-fill toggle if present
            const autoFillToggle = document.getElementById('autoFillToggle');
            if (autoFillToggle) {
                prescriptionData.autoFill = !!autoFillToggle.checked;
                autoFillToggle.addEventListener('change', (e) => {
                    prescriptionData.autoFill = !!e.target.checked;
                });
            }
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) handleFiles(files[0]);
        }

        function handleFileSelect(e) {
            if (e.target.files.length) handleFiles(e.target.files[0]);
        }

        function handleFiles(file) {
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                alert('Please upload an image file (JPG, PNG) or PDF');
                return;
            }
            
            prescriptionData.image = file;
            
            if (file.type === 'application/pdf') {
                // Handle PDF file
                const reader = new FileReader();
                reader.onload = (e) => {
                    prescriptionData.imageDataUrl = e.target.result;
                    // For PDF, show a document icon instead of image preview
                    document.getElementById('previewImg').style.display = 'none';
                    const pdfIcon = document.createElement('div');
                    pdfIcon.id = 'pdfPreview';
                    pdfIcon.className = 'flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg border-2 border-gray-300';
                    pdfIcon.innerHTML = `
                        <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
                        <p class="text-lg font-semibold text-gray-700">${file.name}</p>
                        <p class="text-sm text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    `;
                    
                    const previewContainer = document.getElementById('imagePreview');
                    // Remove existing PDF preview if any
                    const existingPdf = document.getElementById('pdfPreview');
                    if (existingPdf) existingPdf.remove();
                    
                    previewContainer.insertBefore(pdfIcon, previewContainer.firstChild);
                    document.getElementById('uploadPlaceholder').classList.add('hidden');
                    document.getElementById('imagePreview').classList.remove('hidden');
                    document.getElementById('analysisError').classList.add('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                // Handle image file (existing logic)
                const reader = new FileReader();
                reader.onload = (e) => {
                    prescriptionData.imageDataUrl = e.target.result;
                    document.getElementById('previewImg').src = e.target.result;
                    document.getElementById('previewImg').style.display = 'block';
                    // Remove PDF preview if switching from PDF to image
                    const existingPdf = document.getElementById('pdfPreview');
                    if (existingPdf) existingPdf.remove();
                    
                    document.getElementById('uploadPlaceholder').classList.add('hidden');
                    document.getElementById('imagePreview').classList.remove('hidden');
                    document.getElementById('analysisError').classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        }

        function retakePhoto() {
            document.getElementById('prescriptionInput').value = '';
            document.getElementById('uploadPlaceholder').classList.remove('hidden');
            document.getElementById('imagePreview').classList.add('hidden');
            
            // Clean up both image and PDF previews
            document.getElementById('previewImg').style.display = 'block';
            const existingPdf = document.getElementById('pdfPreview');
            if (existingPdf) existingPdf.remove();
            
            prescriptionData.image = null;
            prescriptionData.imageDataUrl = null;
            prescriptionData.analysisSuccess = false;
        }

        function checkZipCode() {
            const zip = document.getElementById('zipCode').value.trim();
            const messageEl = document.getElementById('zipMessage');
            
            if (zip.length !== 5 || !/^\d+$/.test(zip)) {
                messageEl.textContent = 'Please enter a valid 5-digit ZIP code';
                messageEl.className = 'mt-2 text-sm text-red-600';
                messageEl.classList.remove('hidden');
                return;
            }

            prescriptionData.zipCode = zip;
            
            if (serviceZipCodes.includes(zip)) {
                messageEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Great! We deliver to your area';
                messageEl.className = 'mt-2 text-sm text-green-600 font-semibold';
            } else {
                messageEl.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Sorry, we don\'t deliver to this area yet. Try 10001, 90210, or 60601 for demo.';
                messageEl.className = 'mt-2 text-sm text-orange-600';
            }
            messageEl.classList.remove('hidden');
        }

        // Simulate AI Analysis - NOW PROPERLY CHECKS FOR IMAGE DATA
        function startAnalysis() {
            if (!prescriptionData.zipCode || !serviceZipCodes.includes(prescriptionData.zipCode)) {
                alert('Please enter a valid service area ZIP code first');
                document.getElementById('zipCode').focus();
                return;
            }

            if (!prescriptionData.image || !prescriptionData.imageDataUrl) {
                alert('Please upload a prescription image first');
                return;
            }

            // Show OCR processing
            document.getElementById('ocrProcessing').classList.remove('hidden');
            document.getElementById('imagePreview').classList.add('opacity-50');
            document.getElementById('analysisError').classList.add('hidden');
            
            // Simulate progressive analysis
            const steps = [
                { progress: 20, status: 'Uploading image...', detail: 'Secure transfer to AI server' },
                { progress: 40, status: 'Enhancing image quality...', detail: 'Denoising and sharpening text' },
                { progress: 60, status: 'Running OCR analysis...', detail: 'Detecting text regions and handwriting' },
                { progress: 80, status: 'Extracting medical data...', detail: 'Identifying medicines and dosages' },
                { progress: 100, status: 'Verifying prescription...', detail: 'Cross-referencing drug database' }
            ];

            let currentStep = 0;
            const interval = setInterval(() => {
                if (currentStep >= steps.length) {
                    clearInterval(interval);
                    // NOW ACTUALLY ANALYZES THE IMAGE - returns null if no valid prescription detected
                    analyzeImageContent();
                    return;
                }
                
                const step = steps[currentStep];
                document.getElementById('analysisProgress').style.width = step.progress + '%';
                document.getElementById('ocrStatus').textContent = step.status;
                document.getElementById('ocrDetail').textContent = step.detail;
                currentStep++;
            }, 600);
        }

        // ACTUAL IMAGE ANALYSIS - Returns null if image is blank/invalid
    async function analyzeImageContent() {
            // In a real app, this would be an API call
            // For demo, we check if image has content by attempting to detect if it's a real prescription
            
            // Create an image element to check dimensions and content
            const img = new Image();
            img.onload = async function() {
                // Hide any previous OCR debug output
                try {
                    const dbgContainer = document.getElementById('ocrDebugContainer');
                    if (dbgContainer) dbgContainer.classList.add('hidden');
                } catch (e) {}
                // Check image characteristics (returns metrics)
                const metrics = checkImageHasContent(this);

                // If visual heuristic says no content and Tesseract is NOT available,
                // we can't do OCR here, so show no-data. If Tesseract is available,
                // still attempt OCR (sometimes visual heuristic misses complex layouts).
                if (!metrics.hasContent && !(window.Tesseract && typeof Tesseract.recognize === 'function')) {
                    showNoDataState();
                } else {
                    // We have visual content that *might* be text. Run a lightweight OCR keyword check
                    // to avoid treating arbitrary images (like signs) as prescriptions.
                    let ocrPass = true; // default to true if OCR not available or fails

                    if (window.Tesseract && typeof Tesseract.recognize === 'function') {
                        let detectedText = '';
                        try {
                            const result = await Tesseract.recognize(prescriptionData.imageDataUrl, 'eng');
                            detectedText = (result && result.data && result.data.text) ? result.data.text.toLowerCase() : '';

                            // Show OCR debug output in UI (if present) and include visual metrics
                            try {
                                const debugEl = document.getElementById('ocrDebug');
                                if (debugEl) {
                                    let metricsText = '\n\n[Visual metrics]\n';
                                    metricsText += 'hasContent: ' + Boolean(metrics.hasContent) + '\n';
                                    metricsText += 'highContrastRatio: ' + (metrics.highContrastRatio || 0).toFixed(3) + '\n';
                                    metricsText += 'avgVariance: ' + (metrics.avgVariance || 0).toFixed(2) + '\n';
                                    metricsText += 'fileSize: ' + (metrics.fileSize || 0) + '\n';
                                    metricsText += 'dimensions: ' + (metrics.width || 0) + 'x' + (metrics.height || 0) + '\n';

                                    debugEl.textContent = (detectedText || '(no text)') + metricsText;
                                    const container = document.getElementById('ocrDebugContainer');
                                    if (container) container.classList.remove('hidden');
                                }
                            } catch (e) { /* ignore */ }

                            // Prescription-specific keywords (simple heuristic)
                            const keywords = ['rx', 'dr', 'doctor', 'prescription', 'mg', 'tablet', 'capsule', 'take', 'dose', 'sig', 'directions', 'usage', 'qty', 'quantity'];
                            ocrPass = keywords.some(k => detectedText.includes(k));

                            // For debugging you can also log to console:
                            // console.log('OCR text:', detectedText, 'ocrPass:', ocrPass);
                        } catch (err) {
                            console.warn('Tesseract OCR error:', err);
                            // Show error in OCR debug panel if available
                            try {
                                const debugEl = document.getElementById('ocrDebug');
                                if (debugEl) {
                                    debugEl.textContent = 'Tesseract error: ' + (err && err.message ? err.message : String(err));
                                    const container = document.getElementById('ocrDebugContainer');
                                    if (container) container.classList.remove('hidden');
                                }
                            } catch (e) {}

                            // If OCR fails, keep previous behavior (accept image based on visual heuristic)
                            ocrPass = true;
                        }

                        // If OCR passed keyword check, attempt to parse structured data from detectedText
                        if (ocrPass) {
                            const parsed = parseOcrText(detectedText);
                            if (parsed) {
                                // Use parsed OCR data (may include suggestions for missing fields)
                                prescriptionData.extractedData = parsed;
                                prescriptionData.analysisSuccess = true;
                                populateVerificationForm(parsed);
                            } else {
                                // No structured data parsed from OCR
                                showNoDataState();
                            }
                        } else {
                            // OCR did not find prescription-like keywords -> treat as non-prescription
                            showNoDataState();
                        }
                    } else {
                        // Tesseract not available -> show no data state
                        showNoDataState();
                    }
                }
                
                // Hide processing
                document.getElementById('ocrProcessing').classList.add('hidden');
                document.getElementById('imagePreview').classList.remove('opacity-50');
                
                // Go to step 2 regardless - user can enter manually if no data found
                // Debug: output the extracted data and visual metrics for troubleshooting
                try {
                    console.debug('ANALYSIS COMPLETE', {
                        extractedData: prescriptionData.extractedData,
                        analysisSuccess: prescriptionData.analysisSuccess,
                        forceOcr: !!prescriptionData.forceOcr,
                        metrics: metrics || null,
                        ocrAvailable: !!(window.Tesseract && typeof Tesseract.recognize === 'function')
                    });
                } catch (e) {}

                goToStep(2);
            };
            img.src = prescriptionData.imageDataUrl;
        }

        // Check if image actually contains prescription-like content
        function checkImageHasContent(img) {
            // More robust content check with sampling to reduce CPU and avoid false negatives.
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                const pixelCount = data.length / 4;
                // Sample pixels instead of iterating all. Aim for ~50k samples max.
                const targetSamples = 50000;
                const stride = Math.max(1, Math.floor(pixelCount / targetSamples));

                let sampled = 0;
                let highContrast = 0;
                let totalVar = 0;
                let prevBrightness = null;

                for (let i = 0; i < data.length; i += 4 * stride) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const brightness = (r + g + b) / 3;

                    if (brightness < 60 || brightness > 195) highContrast++;

                    if (prevBrightness !== null) totalVar += Math.abs(brightness - prevBrightness);
                    prevBrightness = brightness;
                    sampled++;
                }

                const highContrastRatio = highContrast / sampled;
                const avgVariance = totalVar / Math.max(1, sampled - 1);

                // Basic file/dimension heuristics
                const fileSize = (prescriptionData.image && prescriptionData.image.size) ? prescriptionData.image.size : 0;
                const hasReasonableSize = fileSize > 5000; // >5KB
                const hasReasonableDimensions = img.width >= 50 && img.height >= 50;

                // Decide thresholds: some prescriptions are light, so be a bit permissive
                const likelyText = highContrastRatio > 0.06 && avgVariance > 8;

                return {
                    hasContent: hasReasonableSize && hasReasonableDimensions && likelyText,
                    highContrastRatio,
                    avgVariance,
                    fileSize,
                    width: img.width,
                    height: img.height
                };
            } catch (err) {
                console.warn('checkImageHasContent error', err);
                // If canvas read fails (rare), fall back to file size heuristic
                const fs = (prescriptionData.image && prescriptionData.image.size) ? prescriptionData.image.size : 0;
                return { hasContent: fs > 10000, highContrastRatio: 0, avgVariance: 0, fileSize: fs, width: img.width || 0, height: img.height || 0 };
            }
        }

        // Parse raw OCR text into structured prescription-like data (best-effort)
        function parseOcrText(rawText) {
            if (!rawText || !rawText.trim()) return null;
            const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

            let doctorName = null;
            let rxNumber = null;
            let date = null;
            const medicines = [];
            const medicineSuggestions = [];
            let doctorSuggestion = null;
            let rxSuggestion = null;
            let dateSuggestion = null;

            // Detect RX number (patterns like RX 12345, Rx#12345, RX:12345)
            for (const line of lines) {
                const rxMatch = line.match(/\brx[:#\s-]*([A-Za-z0-9-]+)/i);
                if (rxMatch) { rxNumber = rxMatch[1]; break; }
            }

            // Detect doctor name (lines starting with Dr. or containing 'doctor')
            for (const line of lines) {
                const drMatch = line.match(/^dr\.?\s+([A-Z][\w\s\.,'-]{1,60})/i);
                if (drMatch) { doctorName = drMatch[0]; break; }
                if (/doctor[:\s]/i.test(line)) {
                    // take trailing words
                    const parts = line.split(/doctor[:\s]/i);
                    if (parts[1]) doctorName = parts[1].trim();
                }
            }

            // Detect date (common formats)
            for (const line of lines) {
                const dateMatch = line.match(/(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b)/);
                if (dateMatch) { date = dateMatch[1]; break; }
                const alt = line.match(/(\b\d{4}-\d{2}-\d{2}\b)/);
                if (alt) { date = alt[1]; break; }
            }

            // Detect medicines: look for lines containing mg, tablet, capsule, tab, cap
            for (const line of lines) {
                if (/\b(mg|mcg|tablet|tablets|capsule|capsules|tab|tabs|cap|caps|ml)\b/i.test(line)) {
                    let name = '';
                    let strength = '';
                    let instructions = '';
                    let qty = '';

                    // Extract medicine name and strength (e.g., "ibuprofen 200mg take 1-2 tablets")
                    const strengthMatch = line.match(/^(.+?)\s+(\d+\.?\d*\s?(?:mg|mcg|g|ml|units?|iu|%))\b(.*)$/i);
                    if (strengthMatch) {
                        name = strengthMatch[1].trim();
                        strength = strengthMatch[2].trim();
                        instructions = strengthMatch[3].trim();
                    } else {
                        // Fallback: try to extract just name before any dosage/instruction words
                        const beforeInstructions = line.match(/^(.+?)\s+(?:take|tablet|capsule|cap|tab|daily|twice|once|every|as|with)/i);
                        if (beforeInstructions) {
                            name = beforeInstructions[1].trim();
                            instructions = line.replace(name, '').trim();
                        } else {
                            // Last fallback: split at common separators
                            const parts = line.split(/\-|\u2022|•|:/);
                            name = parts[0].trim();
                            instructions = parts.slice(1).join(' ').trim();
                        }
                    }

                    // attempt to find quantity (e.g., Disp #30 or #30)
                    let qtyMatch = line.match(/disp\b[^\d]*(\d+)/i);
                    if (!qtyMatch) qtyMatch = line.match(/#(\d+)/);
                    if (!qtyMatch) qtyMatch = line.match(/qty[:\s]*(\d+)/i);
                    if (qtyMatch) qty = qtyMatch[1] || '';

                    medicines.push({ 
                        name: name || 'Unknown', 
                        strength: strength || '', 
                        qty: qty || '1', 
                        dosage: instructions || '', 
                        confidence: 'medium', 
                        price: (Math.random() * 50 + 10).toFixed(2) 
                    });
                    medicineSuggestions.push(line);
                }
            }

            // Build confidence score heuristically
            let score = 40;
            if (rxNumber) score += 20;
            if (doctorName) score += 10;
            if (date) score += 5;
            if (medicines.length > 0) score += Math.min(30, medicines.length * 10);
            if (score > 99) score = 99;

            // Suggest fallback snippets when fields are missing
            if (!doctorName) {
                // Don't create suggestions for doctor name - just mark as not found
                doctorSuggestion = null;
            }

            if (!rxNumber) {
                const rxLine = lines.find(l => /\brx[:#\s-]*[A-Za-z0-9-]+/i.test(l));
                if (rxLine) rxSuggestion = rxLine;
            }

            if (!date) {
                const dateLine = lines.find(l => /(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b)|([0-9]{4}-[0-9]{2}-[0-9]{2})/.test(l));
                if (dateLine) dateSuggestion = dateLine;
                else {
                    // Look for UI label 'Date' and take the rest of the line or the next line
                    const dateIdx = lines.findIndex(l => /\bdate\b[:\s-]?/i.test(l));
                    if (dateIdx >= 0) {
                        const dline = lines[dateIdx];
                        const after = dline.replace(/^date[:\s-]*/i, '').trim();
                        if (after) dateSuggestion = after;
                        else if (lines[dateIdx + 1]) dateSuggestion = lines[dateIdx + 1];
                    }
                }
            }

            return {
                rawText: rawText,
                doctorName: doctorName || '',
                doctorSuggestion: doctorSuggestion || '',
                licenseNumber: '',
                licenseSuggestion: '',
                date: date || '',
                dateSuggestion: dateSuggestion || '',
                rxNumber: rxNumber || '',
                rxSuggestion: rxSuggestion || '',
                medicines: medicines.length ? medicines : [],
                medicineSuggestions: medicineSuggestions,
                confidence: score
            };
        }

        // Allow user to accept a parsed suggestion for a specific field
        function acceptSuggestion(fieldKey) {
            const data = prescriptionData.extractedData || {};
            let val = data[fieldKey] || data[fieldKey + 'Suggestion'];
            if (!val && data.rawText) val = data.rawText.split(/\r?\n/)[0];
            // If there's no value in extractedData (race or missing), try to read the suggestion text from the DOM
            if (!val) {
                try {
                    const map = { doctorName: 'doctorExtracted', licenseNumber: 'licenseExtracted', date: 'dateExtracted', rxNumber: 'rxExtracted' };
                    const elId = map[fieldKey];
                    if (elId) {
                        const el = document.getElementById(elId);
                        if (el) {
                            // remove leading labels like 'OCR suggestion:' or 'Detected:' and button text
                            let text = el.textContent || '';
                            text = text.replace(/^(OCR suggestion:|Detected:)/i, '').replace(/Accept/i, '').trim();
                            // If there are multiple lines, pick the first non-empty
                            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                            if (lines.length) val = lines[0];
                        }
                    }
                } catch (e) { /* ignore */ }
            }
            if (!val) return alert('No suggestion available for ' + fieldKey);

            // Clean common label prefixes like 'Provider:', 'Date:', 'Dr.' before filling inputs
            const cleaned = String(val).replace(/^(provider|prescriber|prescribed by|doctor|dr|date)[:\s-]*/i, '').trim();

            // Additional normalization: if cleaned starts with '#' or 'Order ID' or 'Provider', strip it
            const cleaned2 = cleaned.replace(/^(order id|#)[:\s]*/i, '').trim();

            console.debug('acceptSuggestion', fieldKey, 'raw:', val, 'cleaned:', cleaned2);

            if (fieldKey === 'date') {
                const normalized = normalizeDateString(cleaned2);
                if (!normalized) return alert('Could not normalize suggested date: ' + val);
                document.getElementById('prescriptionDate').value = normalized;
                // update extracted display
                const el = document.getElementById('dateExtracted');
                el.innerHTML = 'Detected: <span class="extracted-text">' + normalized + '</span>';
                el.classList.remove('no-data');
                data.date = cleaned2;
            } else if (fieldKey === 'doctorName' || fieldKey === 'licenseNumber' || fieldKey === 'rxNumber') {
                const inputId = fieldKey;
                document.getElementById(inputId).value = cleaned2;
                const displayId = fieldKey === 'doctorName' ? 'doctorExtracted' : (fieldKey === 'licenseNumber' ? 'licenseExtracted' : 'rxExtracted');
                const el = document.getElementById(displayId);
                el.innerHTML = 'Detected: <span class="extracted-text">' + cleaned2 + '</span>';
                el.classList.remove('no-data');
                data[fieldKey] = cleaned2;
            }

            prescriptionData.extractedData = data;
        }

        function acceptMedicineSuggestion(index) {
            const suggestions = prescriptionData.currentMedicineSuggestions || [];
            const s = suggestions[index];
            if (!s) return alert('No suggestion');

            // Let user edit before adding: use prompt for simplicity
            const userVal = prompt('Add medicine (edit if needed)', s);
            if (!userVal) return;
            // Add as a single medicine line; parsing name/qty/dosage is best-effort
            addMedicineToList(userVal, '1', '', 'low', (Math.random() * 50 + 10).toFixed(2));
            document.getElementById('emptyMedicines').classList.add('hidden');
            const count = document.querySelectorAll('.medicine-item').length;
            document.getElementById('detectedCount').textContent = count + ' items';
        }

        // Show state when no prescription data detected
        function showNoDataState() {
            prescriptionData.analysisSuccess = false;
            prescriptionData.extractedData = null;
            
            // Clear all fields
            document.getElementById('doctorName').value = '';
            document.getElementById('licenseNumber').value = '';
            // Do not overwrite the date input here - show suggestions instead.
            // Leave the date input alone so OCR suggestions can be reviewed by the user.
            document.getElementById('rxNumber').value = '';
            
            // Clear medicines
            document.getElementById('medicinesList').innerHTML = '';
            document.getElementById('emptyMedicines').classList.remove('hidden');
            document.getElementById('detectedCount').textContent = '0 items';
            
            // Update UI to show no data state
            document.getElementById('verificationSubtitle').textContent = 'No prescription detected - Please enter details manually';
            document.getElementById('verificationSubtitle').classList.add('text-orange-600');
            
            document.getElementById('imageStatusText').textContent = 'No readable prescription found in image';
            document.getElementById('imageStatusText').classList.add('text-red-600');
            
            document.getElementById('referenceThumb').classList.add('hidden');
            document.getElementById('noImagePlaceholder').classList.remove('hidden');
            
            document.getElementById('confidenceBadges').style.display = 'none';
            document.getElementById('aiBadge').classList.add('hidden');
            
            // Show all "no data" messages
            document.querySelectorAll('[id$="Extracted"]').forEach(el => {
                el.textContent = 'No data extracted - enter manually';
                el.classList.add('no-data', 'text-red-500');
            });
            
            document.getElementById('aiNotes').innerHTML = '<i class="fas fa-exclamation-triangle mr-2 text-yellow-500"></i><strong>No prescription detected:</strong> Please enter all details manually or upload a clearer image of your prescription.';
            document.getElementById('aiNotes').classList.remove('bg-gray-50', 'text-gray-600');
            document.getElementById('aiNotes').classList.add('bg-yellow-50', 'text-yellow-800', 'border', 'border-yellow-200');
            
            // Show error message in step 1
            document.getElementById('analysisError').classList.remove('hidden');
            document.getElementById('errorText').textContent = 'Could not detect prescription in image. Please enter details manually.';
        }

        // Normalize various date string formats into YYYY-MM-DD for <input type="date">
        function normalizeDateString(raw) {
            if (!raw) return null;
            raw = raw.trim();
            // Clean common OCR noise: remove stray symbols and ordinal suffixes (st, nd, rd, th)
            raw = raw.replace(/(st|nd|rd|th)\b/gi, '');
            raw = raw.replace(/[&‡•†°ªº]/g, '');
            raw = raw.replace(/[ ]{2,}/g, ' ');
            // Remove characters that commonly appear due to OCR noise but are not meaningful in dates
            raw = raw.replace(/[^A-Za-z0-9\s\-\/,:]/g, '');

            // Try ISO-like first
            const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

            // Match common US written e.g., November 8, 2021 or Nov 8 2021
            const writtenMatch = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
            if (writtenMatch) {
                const month = (new Date(writtenMatch[1] + ' 1, 2000')).getMonth() + 1;
                const mm = String(month).padStart(2, '0');
                const dd = String(writtenMatch[2]).padStart(2, '0');
                return `${writtenMatch[3]}-${mm}-${dd}`;
            }

            // Match slashed or dashed dates mm/dd/yyyy or dd/mm/yyyy heuristics
            const slashMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (slashMatch) {
                let m = parseInt(slashMatch[1], 10);
                let d = parseInt(slashMatch[2], 10);
                let y = parseInt(slashMatch[3], 10);
                if (y < 100) y += 2000;
                // Heuristic: if month > 12, swap
                if (m > 12 && d <= 12) {
                    const tmp = m; m = d; d = tmp;
                }
                const mm = String(m).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                return `${y}-${mm}-${dd}`;
            }

            return null;
        }

        // Populate form with extracted data
        function populateVerificationForm(data) {
            // Show success state
            document.getElementById('verificationSubtitle').textContent = 'Review AI-extracted information';
            document.getElementById('verificationSubtitle').classList.remove('text-orange-600');
            
            document.getElementById('imageStatusText').textContent = 'Prescription successfully analyzed';
            document.getElementById('imageStatusText').classList.remove('text-red-600');
            document.getElementById('imageStatusText').classList.add('text-green-600');
            
            document.getElementById('referenceThumb').src = prescriptionData.imageDataUrl;
            document.getElementById('referenceThumb').classList.remove('hidden');
            document.getElementById('noImagePlaceholder').classList.add('hidden');
            
            document.getElementById('confidenceBadges').style.display = 'flex';
            document.getElementById('qualityScore').textContent = 'Good';
            document.getElementById('confidenceScore').textContent = data.confidence + '%';
            
            document.getElementById('aiBadge').classList.remove('hidden');
            
            // Fill doctor info (only fill input if we have a confident value)
            if (data.doctorName) document.getElementById('doctorName').value = data.doctorName;
            if (data.licenseNumber) document.getElementById('licenseNumber').value = data.licenseNumber;
            if (data.date) {
                const normalized = normalizeDateString(data.date);
                if (normalized) document.getElementById('prescriptionDate').value = normalized;
                else {
                    // if data.date looks invalid (e.g., age '30'), show as suggestion instead of filling
                    const dateExtractedEl = document.getElementById('dateExtracted');
                    dateExtractedEl.innerHTML = 'OCR suggestion: <span class="extracted-text">' + (data.dateSuggestion || data.date) + '</span>';
                    dateExtractedEl.classList.add('no-data');
                }
            }
            if (data.rxNumber) document.getElementById('rxNumber').value = data.rxNumber;

            // Update extracted text displays or show OCR suggestions when data is missing
            const doctorExtractedEl = document.getElementById('doctorExtracted');
            if (data.doctorName) {
                doctorExtractedEl.innerHTML = 'Detected: <span class="extracted-text">' + data.doctorName + '</span>';
                doctorExtractedEl.classList.remove('no-data', 'text-red-500');
            } else {
                doctorExtractedEl.innerHTML = 'No doctor name found - enter manually';
                doctorExtractedEl.classList.add('no-data');
                doctorExtractedEl.classList.remove('text-red-500');
            }

            const licenseExtractedEl = document.getElementById('licenseExtracted');
            if (data.licenseNumber) {
                licenseExtractedEl.innerHTML = 'OCR Result: <span class="extracted-text">' + data.licenseNumber + '</span>';
                licenseExtractedEl.classList.remove('no-data', 'text-red-500');
            } else {
                const s = data.licenseSuggestion || '';
                licenseExtractedEl.innerHTML = s ? 'OCR suggestion: <span class="extracted-text">' + s + '</span> <button onclick="acceptSuggestion(\'licenseNumber\')" class="ocr-suggestion-btn ml-2">Accept</button>' : 'No data extracted - enter manually';
                licenseExtractedEl.classList.add('no-data');
            }

            const dateExtractedEl = document.getElementById('dateExtracted');
            if (data.date) {
                const normalized = normalizeDateString(data.date);
                const display = normalized || data.date;
                dateExtractedEl.innerHTML = 'Detected: <span class="extracted-text">' + display + '</span>';
                dateExtractedEl.classList.remove('no-data', 'text-red-500');
            } else {
                const s = data.dateSuggestion || '';
                dateExtractedEl.innerHTML = s ? 'OCR suggestion: <span class="extracted-text">' + s + '</span> <button onclick="acceptSuggestion(\'date\')" class="ocr-suggestion-btn ml-2">Accept</button>' : 'No data extracted - enter manually';
                dateExtractedEl.classList.add('no-data');
            }

            const rxExtractedEl = document.getElementById('rxExtracted');
            if (data.rxNumber) {
                rxExtractedEl.innerHTML = 'Barcode: <span class="extracted-text">' + data.rxNumber + '</span>';
                rxExtractedEl.classList.remove('no-data', 'text-red-500');
            } else {
                const s = data.rxSuggestion || '';
                rxExtractedEl.innerHTML = s ? 'OCR suggestion: <span class="extracted-text">' + s + '</span> <button onclick="acceptSuggestion(\'rxNumber\')" class="ocr-suggestion-btn ml-2">Accept</button>' : 'No data extracted - enter manually';
                rxExtractedEl.classList.add('no-data');
            }
            // Auto-fill heuristics: try to automatically populate date when suggestions look valid
            if (prescriptionData.autoFill) {
                try {
                    // helper to clean suggestion text
                    const clean = (v) => String(v || '').replace(/^(provider|prescriber|prescribed by|doctor|dr|date|ocr suggestion:|detected:|\#)[:\s-]*/i, '').trim();

                    // Only auto-fill doctor if we have a confidently detected doctor name (not suggestions)
                    // If no doctor name found via OCR, let user enter manually - no auto-fill from suggestions

                    // Auto-fill date if parsed or suggestion can be normalized
                    if (!document.getElementById('prescriptionDate').value) {
                        const dVal = data.date || data.dateSuggestion;
                        const cleanedDate = clean(dVal);
                        const normalized = normalizeDateString(cleanedDate);
                        if (normalized) {
                            document.getElementById('prescriptionDate').value = normalized;
                            const el = document.getElementById('dateExtracted');
                            el.innerHTML = 'Detected: <span class="extracted-text">' + normalized + '</span>';
                            el.classList.remove('no-data');
                            data.date = cleanedDate;
                        }
                    }
                } catch (e) { /* ignore auto-fill errors */ }
            }
            
            // Clear and populate medicines
            document.getElementById('medicinesList').innerHTML = '';
            
            if (data.medicines && data.medicines.length > 0) {
                data.medicines.forEach((med, index) => {
                    addMedicineToList(med.name, med.strength || '', med.qty, med.dosage, med.confidence, med.price);
                });
                document.getElementById('detectedCount').textContent = data.medicines.length + ' detected';
                document.getElementById('emptyMedicines').classList.add('hidden');
                document.getElementById('aiNotes').innerHTML = '<i class="fas fa-robot mr-2 text-purple-500"></i><strong>AI detected ' + data.medicines.length + ' medications.</strong> Please verify all details match your prescription label.';
                document.getElementById('aiNotes').classList.remove('bg-yellow-50', 'text-yellow-800', 'border', 'border-yellow-200');
                document.getElementById('aiNotes').classList.add('bg-gray-50', 'text-gray-600');
            } else if (data.medicineSuggestions && data.medicineSuggestions.length > 0) {
                // Show OCR suggestions for medicines so user can copy them into the form
                const suggestionsHtml = data.medicineSuggestions.map(s => '<div class="py-1 text-sm text-gray-700">' + s + '</div>').join('');
                document.getElementById('emptyMedicines').innerHTML = '<div class="text-left px-4 py-3"><strong>OCR suggestions:</strong>' + suggestionsHtml + '<p class="text-xs text-gray-500 mt-2">Tap Add Medicine and copy the suggestion into the fields.</p></div>';
                document.getElementById('emptyMedicines').classList.remove('hidden');
                document.getElementById('detectedCount').textContent = data.medicineSuggestions.length + ' suggested';
                document.getElementById('aiNotes').innerHTML = '<i class="fas fa-robot mr-2 text-purple-500"></i><strong>OCR provided suggestions for medicines.</strong> Please review and add them manually.';
                document.getElementById('aiNotes').classList.remove('bg-yellow-50', 'text-yellow-800', 'border', 'border-yellow-200');
                document.getElementById('aiNotes').classList.add('bg-gray-50', 'text-gray-600');
            } else {
                // no medicines detected or suggested
                document.getElementById('emptyMedicines').innerHTML = '<i class="fas fa-prescription-bottle-alt text-4xl mb-2"></i><p>No medicines detected. Add manually or retake photo.</p>';
                document.getElementById('emptyMedicines').classList.remove('hidden');
                document.getElementById('detectedCount').textContent = '0 items';
                document.getElementById('aiNotes').innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>Enter prescription details manually or upload a clearer image for auto-detection.';
                document.getElementById('aiNotes').classList.remove('bg-yellow-50', 'text-yellow-800', 'border', 'border-yellow-200');
                document.getElementById('aiNotes').classList.add('bg-gray-50', 'text-gray-600');
            }
        }

        function addMedicineToList(name, strength, qty, dosage, confidence = 'low', price = null) {
            const template = document.getElementById('medicineTemplate').content.cloneNode(true);
            const item = template.querySelector('.medicine-item');
            
            // Split name and strength if they're combined in the name parameter
            let medicineName = name;
            let medicineStrength = strength || '';
            
            if (!strength && name) {
                // Try to extract strength from name (e.g., "Amoxicillin 500mg" -> name: "Amoxicillin", strength: "500mg")
                const strengthMatch = name.match(/^(.+?)\s+(\d+\.?\d*\s?(?:mg|mcg|g|ml|units?|iu|%))$/i);
                if (strengthMatch) {
                    medicineName = strengthMatch[1].trim();
                    medicineStrength = strengthMatch[2].trim();
                }
            }
            
            template.querySelector('.medicine-name').value = medicineName;
            template.querySelector('.medicine-strength').value = medicineStrength;
            template.querySelector('.medicine-qty').value = qty;
            template.querySelector('.medicine-dosage').value = dosage;
            
            if (price) {
                item.dataset.price = price;
            }
            
            document.getElementById('medicinesList').appendChild(template);
        }

        function addMedicine() {
            addMedicineToList('', '', '', '', 'low', (Math.random() * 50 + 10).toFixed(2));
            document.getElementById('emptyMedicines').classList.add('hidden');
            const count = document.querySelectorAll('.medicine-item').length;
            document.getElementById('detectedCount').textContent = count + ' items';
        }

        function removeMedicine(btn) {
            btn.closest('.medicine-item').remove();
            const count = document.querySelectorAll('.medicine-item').length;
            document.getElementById('detectedCount').textContent = count + ' items';
            if (count === 0) {
                document.getElementById('emptyMedicines').classList.remove('hidden');
            }
        }

        function proceedToReview() {
            const medicines = [];
            document.querySelectorAll('.medicine-item').forEach(item => {
                const name = item.querySelector('.medicine-name').value;
                const strength = item.querySelector('.medicine-strength').value;
                const qty = item.querySelector('.medicine-qty').value;
                const dosage = item.querySelector('.medicine-dosage').value;
                const price = item.dataset.price || (Math.random() * 50 + 10).toFixed(2);

                if (!name) {
                    alert('Please fill in all medicine names');
                    return;
                }

                // Combine name and strength for display
                const displayName = strength ? `${name} ${strength}` : name;
                medicines.push({ name: displayName, qty, dosage, price });
            });

            if (medicines.length === 0) {
                alert('Please add at least one medicine');
                return;
            }

            prescriptionData.medicines = medicines;
            
            const summaryHtml = medicines.map(m => `
                <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                        <p class="font-semibold text-gray-800">${m.name}</p>
                        <p class="text-sm text-gray-500">Qty: ${m.qty} • ${m.dosage}</p>
                    </div>
                    <span class="font-semibold text-gray-800">$${m.price}</span>
                </div>
            `).join('');
            
            document.getElementById('orderSummary').innerHTML = summaryHtml;
            
            const total = medicines.reduce((sum, m) => sum + parseFloat(m.price), 0);
            document.getElementById('subtotal').textContent = '$' + total.toFixed(2);
            document.getElementById('total').textContent = '$' + total.toFixed(2);
            
            goToStep(3);
        }

        function selectPharmacy(card, index) {
            document.querySelectorAll('.pharmacy-card').forEach(c => {
                c.classList.remove('bg-purple-50', 'border-purple-500');
                c.classList.add('bg-white', 'border-gray-200');
            });
            card.classList.remove('bg-white', 'border-gray-200');
            card.classList.add('bg-purple-50', 'border-purple-500');
            prescriptionData.pharmacy = index;
        }

        function proceedToCheckout() {
            if (prescriptionData.pharmacy === null) {
                alert('Please select a pharmacy');
                return;
            }
            goToStep(4);
            
            setTimeout(() => {
                document.getElementById('trackingProgress').style.width = '66%';
            }, 1000);
            
            document.getElementById('finalDoctor').textContent = document.getElementById('doctorName').value.split(' ').pop() || 'Smith';
        }

        function goToStep(step) {
            for (let i = 1; i <= 4; i++) {
                document.getElementById(`step${i}`).classList.add('hidden');
            }
            
            document.getElementById(`step${step}`).classList.remove('hidden');
            
            for (let i = 1; i <= 4; i++) {
                const indicator = document.getElementById(`step${i}-indicator`);
                const progress = document.getElementById(`progress${i}`);
                
                if (i < step) {
                    indicator.classList.remove('bg-gray-300', 'step-active');
                    indicator.classList.add('step-completed');
                    indicator.innerHTML = '<i class="fas fa-check"></i>';
                    if (progress) progress.style.width = '100%';
                } else if (i === step) {
                    indicator.classList.remove('bg-gray-300', 'step-completed');
                    indicator.classList.add('step-active');
                    indicator.textContent = i;
                } else {
                    indicator.classList.remove('step-active', 'step-completed');
                    indicator.classList.add('bg-gray-300');
                    indicator.textContent = i;
                    if (progress) progress.style.width = '0%';
                }
            }
            
            currentStep = step;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Copy analysis (extractedData + metrics) to clipboard for sharing/troubleshooting
        function copyAnalysisJson() {
            const payload = {
                extractedData: prescriptionData.extractedData,
                analysisSuccess: prescriptionData.analysisSuccess,
                forceOcr: !!prescriptionData.forceOcr,
                autoFill: !!prescriptionData.autoFill
            };
            const json = JSON.stringify(payload, null, 2);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(json).then(() => {
                    alert('Analysis JSON copied to clipboard');
                }).catch(err => {
                    fallbackCopy(json);
                });
            } else {
                fallbackCopy(json);
            }

            function fallbackCopy(text) {
                const t = document.createElement('textarea');
                t.value = text;
                document.body.appendChild(t);
                t.select();
                try {
                    document.execCommand('copy');
                    alert('Analysis JSON copied to clipboard');
                } catch (e) {
                    prompt('Copy this JSON', text);
                }
                t.remove();
            }
        }

        function backToStep(step) {
            goToStep(step);
        }

        function toggleMobileMenu() {
            alert('Mobile menu would toggle here');
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Initialize interactive handlers and defaults
            initUI();
            const dateInput = document.getElementById('prescriptionDate');
            if (dateInput) dateInput.valueAsDate = new Date();
        });