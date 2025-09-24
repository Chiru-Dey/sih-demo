document.addEventListener('DOMContentLoaded', () => {
    console.log('Report.js loaded');

    // Form elements
    const form = document.getElementById('disaster-report-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const mediaInput = document.getElementById('media');
    const mediaPreview = document.getElementById('mediaPreview');
    const title = document.getElementById('title');
    const type = document.getElementById('type');
    const severity = document.getElementById('severity');
    const description = document.getElementById('description');
    const location = document.getElementById('location');
    location.value = "Bardhaman";

    // Media handling configuration
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ACCEPTED_TYPES = {
        'image/jpeg': 'image',
        'image/png': 'image',
        'image/gif': 'image',
        'video/mp4': 'video',
        'video/webm': 'video',
        'video/quicktime': 'video',
        'audio/mpeg': 'audio',
        'audio/wav': 'audio',
        'audio/ogg': 'audio'
    };

    // Initialize media container and file input
    const mediaContainer = document.querySelector('.media-container');
    const mediaBtn = document.querySelector('.media-btn');

    // Handle button click
    if (mediaBtn && mediaInput) {
        mediaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mediaInput.click();
        });
    }

    // Handle drag and drop events
    if (mediaContainer) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            mediaContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            mediaContainer.addEventListener(eventName, () => {
                mediaContainer.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            mediaContainer.addEventListener(eventName, () => {
                mediaContainer.classList.remove('dragover');
            });
        });

        mediaContainer.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });
    }

    // File input change handler
    mediaInput.addEventListener('change', () => {
        const files = Array.from(mediaInput.files);
        handleFiles(files);
    });

    // Handle multiple files
    function handleFiles(files) {
        const validFiles = files.filter(file => {
            if (!ACCEPTED_TYPES[file.type]) {
                showError('Invalid file type: ' + file.type);
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                showError(`File too large: ${file.name}. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
                return false;
            }
            return true;
        });

        validFiles.forEach(addFilePreview);
    }

    // Create preview for a file
    function addFilePreview(file) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        // Add filename with truncation
        const filename = document.createElement('span');
        filename.className = 'filename';
        filename.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
        previewItem.appendChild(filename);

        // Add remove button
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => previewItem.remove());
        previewItem.appendChild(removeBtn);
        
        mediaPreview.appendChild(previewItem);
    }

    // Create remove button for preview
    function createRemoveButton(previewItem) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            previewItem.remove();
        });
        return removeBtn;
    }

    // Show error message
    function showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Form validation configuration
    const validationRules = {
        title: {
            minLength: 5,
            maxLength: 100,
            message: 'Title must be between 5 and 100 characters'
        },
        description: {
            minLength: 50,
            maxLength: 1000,
            message: 'Description must be between 50 and 1000 characters'
        },
        location: {
            required: true,
            message: 'Location is required. Please enter manually.'
        }
    };

    // Form validation function
    function validateForm() {
        let isValid = true;
        
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        if (!title.value.trim() || 
            title.value.length < validationRules.title.minLength || 
            title.value.length > validationRules.title.maxLength) {
            showError(validationRules.title.message);
            isValid = false;
        }

        if (!type.value) {
            showError('Please select a disaster type');
            isValid = false;
        }

        if (!severity.value) {
            showError('Please select a severity level');
            isValid = false;
        }

        if (!description.value.trim() || 
            description.value.length < validationRules.description.minLength || 
            description.value.length > validationRules.description.maxLength) {
            showError(validationRules.description.message);
            isValid = false;
        }

        if (!location.value.trim()) {
            showError(validationRules.location.message);
            isValid = false;
        }

        return isValid;
    }

    // Form submission handler
    form.addEventListener('submit', (e) => {
        if (!validateForm()) {
            e.preventDefault();
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    });

    // Initialize form state based on URL parameters
    if (window.location.search.includes('success=true')) {
        showError('Report submitted successfully', 'success');
        form.reset();
        mediaPreview.innerHTML = '';
        
        const url = new URL(window.location);
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url);
    } else if (window.location.search.includes('error=true')) {
        const errorMessage = new URLSearchParams(window.location.search).get('message') || 'Failed to submit report';
        showError(errorMessage);
        
        const url = new URL(window.location);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url);
    }
});