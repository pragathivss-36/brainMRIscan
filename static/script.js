/**
 * Alzheimer's Disease Prediction Web Application
 * Client-side script handling drag & drop file upload, image preview, 
 * asynchronous fetch API prediction requests, and probability grid rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('mri-file-input');
    const uploadPrompt = document.getElementById('upload-prompt');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const fileSizeDisplay = document.getElementById('file-size');
    
    const errorAlert = document.getElementById('error-alert');
    const errorMessage = document.getElementById('error-message');
    const actionBar = document.getElementById('action-bar');
    
    const resetBtn = document.getElementById('reset-btn');
    const predictBtn = document.getElementById('predict-btn');
    
    const loadingState = document.getElementById('loading-state');
    const resultContainer = document.getElementById('result-container');
    const newPredictionBtn = document.getElementById('new-prediction-btn');
    
    const resultClassName = document.getElementById('result-class-name');
    const resultConfidenceVal = document.getElementById('result-confidence-val');
    const confidencePercentageLabel = document.getElementById('confidence-percentage-label');
    const mainProgressFill = document.getElementById('main-progress-fill');
    const probGrid = document.getElementById('prob-grid');
    const clinicalSummaryText = document.getElementById('clinical-summary-text');

    const step1Badge = document.getElementById('step-1-badge');
    const step2Badge = document.getElementById('step-2-badge');
    const step3Badge = document.getElementById('step-3-badge');

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    let selectedFile = null;

    // Mobile Navbar Toggle
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }

    // Drag and Drop Events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    dropzone.addEventListener('click', (e) => {
        // Prevent trigger if clicking already active preview
        if (!previewContainer.classList.contains('hidden')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFileSelection(fileInput.files[0]);
        }
    });

    // File Validation & Preview
    function handleFileSelection(file) {
        hideError();
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const maxSizeBytes = 16 * 1024 * 1024; // 16MB

        if (!validTypes.includes(file.type)) {
            showError('Please upload a JPG, JPEG, or PNG image file.');
            return;
        }

        if (file.size > maxSizeBytes) {
            showError('File size exceeds the 16MB limit. Please select a smaller MRI image.');
            return;
        }

        selectedFile = file;

        // Render Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            fileNameDisplay.textContent = file.name;
            fileSizeDisplay.textContent = formatBytes(file.size);

            uploadPrompt.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            actionBar.classList.remove('hidden');

            updateStepBadges(2);
        };
        reader.readAsDataURL(file);
    }

    // Reset Selection
    function resetUI() {
        selectedFile = null;
        fileInput.value = '';
        imagePreview.src = '';

        previewContainer.classList.add('hidden');
        uploadPrompt.classList.remove('hidden');
        actionBar.classList.add('hidden');
        loadingState.classList.add('hidden');
        resultContainer.classList.add('hidden');
        dropzone.classList.remove('hidden');

        hideError();
        updateStepBadges(1);
    }

    resetBtn.addEventListener('click', resetUI);
    newPredictionBtn.addEventListener('click', resetUI);

    // Predict Button Event
    predictBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('Please select an MRI image scan first.');
            return;
        }

        // Hide upload bar, show loading state
        dropzone.classList.add('hidden');
        actionBar.classList.add('hidden');
        hideError();
        loadingState.classList.remove('hidden');
        updateStepBadges(2);

        // Prepare Form Data
        const formData = new FormData();
        formData.append('mri_image', selectedFile);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            loadingState.classList.add('hidden');

            if (data.success) {
                renderResults(data);
                updateStepBadges(3);
            } else {
                dropzone.classList.remove('hidden');
                actionBar.classList.remove('hidden');
                showError(data.error || 'Failed to analyze the MRI image.');
                updateStepBadges(1);
            }
        } catch (err) {
            console.error('Prediction API Error:', err);
            loadingState.classList.add('hidden');
            dropzone.classList.remove('hidden');
            actionBar.classList.remove('hidden');
            showError('Unable to connect to Flask server. Please check if backend is running.');
            updateStepBadges(1);
        }
    });

    // Render Prediction Results
    function renderResults(data) {
        resultContainer.classList.remove('hidden');

        const className = data.predicted_class;
        const confidence = data.confidence;

        resultClassName.textContent = className;
        resultConfidenceVal.textContent = `${confidence.toFixed(2)}%`;
        confidencePercentageLabel.textContent = `${confidence.toFixed(2)}%`;

        // Animate main progress fill
        setTimeout(() => {
            mainProgressFill.style.width = `${confidence}%`;
        }, 100);

        // Render Probabilities Grid
        probGrid.innerHTML = '';
        data.probabilities.forEach(item => {
            const isTop = item.is_top;
            const probCard = document.createElement('div');
            probCard.className = `prob-card ${isTop ? 'top-prediction' : ''}`;

            probCard.innerHTML = `
                <div class="prob-card-header">
                    <span class="prob-class-name">${item.class_name}</span>
                    <span class="prob-percentage">${item.probability.toFixed(2)}%</span>
                </div>
                <div class="prob-bar-track">
                    <div class="prob-bar-fill" style="width: 0%;"></div>
                </div>
            `;

            probGrid.appendChild(probCard);

            // Animate bar fill
            setTimeout(() => {
                const fill = probCard.querySelector('.prob-bar-fill');
                if (fill) {
                    fill.style.width = `${item.probability}%`;
                    if (isTop) {
                        fill.style.background = 'linear-gradient(90deg, #38bdf8, #818cf8)';
                    }
                }
            }, 150);
        });

        // Clinical summary text
        setClinicalSummary(className, confidence);
    }

    function setClinicalSummary(className, confidence) {
        let note = "";
        if (className === "Non Demented") {
            note = `The AI model detected minimal to no features associated with dementia in this brain MRI scan (Confidence: ${confidence.toFixed(2)}%).`;
        } else if (className === "Very Mild Demented") {
            note = `The AI model identified subtle structural brain changes characteristic of Very Mild Dementia (Confidence: ${confidence.toFixed(2)}%). Early medical monitoring is recommended.`;
        } else if (className === "Mild Demented") {
            note = `The AI model identified clear structural patterns corresponding to Mild Dementia stage (Confidence: ${confidence.toFixed(2)}%).`;
        } else if (className === "Moderate Demented") {
            note = `The AI model detected pronounced tissue pattern variations associated with Moderate Dementia (Confidence: ${confidence.toFixed(2)}%).`;
        } else {
            note = `Model output classified as ${className} with ${confidence.toFixed(2)}% statistical probability.`;
        }
        clinicalSummaryText.textContent = note;
    }

    function updateStepBadges(stepNumber) {
        step1Badge.classList.remove('active');
        step2Badge.classList.remove('active');
        step3Badge.classList.remove('active');

        if (stepNumber >= 1) step1Badge.classList.add('active');
        if (stepNumber >= 2) step2Badge.classList.add('active');
        if (stepNumber >= 3) step3Badge.classList.add('active');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorAlert.classList.remove('hidden');
    }

    function hideError() {
        errorAlert.classList.add('hidden');
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
