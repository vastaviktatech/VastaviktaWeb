// DOM Elements
const loadingState = document.getElementById('loading-state');
const unauthorizedState = document.getElementById('unauthorized-state');
const certificatePanel = document.getElementById('certificate-panel');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const uploadBtn = document.getElementById('upload-certificate');
const clearFormBtn = document.getElementById('clear-form');
const statusMessage = document.getElementById('status-message');
const certificatesGrid = document.getElementById('certificates-grid');
const searchInput = document.getElementById('search-certificates');
const filterType = document.getElementById('filter-type');
const refreshBtn = document.getElementById('refresh-certificates');
const imageInput = document.getElementById('certificate-image');
const imagePreview = document.getElementById('image-preview');
const previewPlaceholder = document.getElementById('preview-placeholder');
const modal = document.getElementById('certificate-modal');
const closeModal = document.getElementById('close-modal');

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Store all certificates for filtering
let allCertificates = [];
let currentUser = null;

// Auth state listener
auth.onAuthStateChanged(user => {
    // Hide loading state
    loadingState.style.display = 'none';
    
    if (user) {
        console.log("User logged in:", user.email);
        currentUser = user;
        
        // Show certificate panel
        unauthorizedState.style.display = 'none';
        certificatePanel.style.display = 'block';
        
        // Update auth status
        document.getElementById('auth-status').style.display = 'block';
        if (userEmailSpan) {
            userEmailSpan.textContent = user.email;
            userEmailSpan.style.marginRight = '10px';
            userEmailSpan.style.color = 'var(--primary-color)';
            userEmailSpan.style.fontWeight = '600';
        }
        
        // Load certificates
        loadCertificates();
        
        // Set default issue date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('issue-date').value = today;
        
    } else {
        console.log("No user logged in");
        currentUser = null;
        
        // Show unauthorized message
        unauthorizedState.style.display = 'flex';
        certificatePanel.style.display = 'none';
        document.getElementById('auth-status').style.display = 'none';
    }
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            console.log("User logged out");
            window.location.href = 'admin.html';
        })
        .catch(error => {
            console.error("Logout error:", error);
            showStatus(`Logout failed: ${error.message}`, 'error');
        });
});

// Image URL preview
imageInput.addEventListener('input', function() {
    const url = this.value.trim();
    if (url) {
        // Process Google Drive URL
        let imageUrl = url;
        if (url.includes('drive.google.com')) {
            const fileIdMatch = url.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
            if (fileIdMatch && fileIdMatch[1]) {
                imageUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
            }
        }
        
        // Show preview
        imagePreview.src = imageUrl;
        imagePreview.classList.add('visible');
        previewPlaceholder.style.display = 'none';
        
        // Handle image load error
        imagePreview.onerror = function() {
            imagePreview.classList.remove('visible');
            previewPlaceholder.style.display = 'block';
            previewPlaceholder.innerHTML = '<i class="fas fa-exclamation-triangle"></i><p>Invalid image URL</p>';
        };
    } else {
        imagePreview.classList.remove('visible');
        previewPlaceholder.style.display = 'block';
        previewPlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Image preview will appear here</p>';
    }
});

// Clear form handler
clearFormBtn.addEventListener('click', () => {
    document.getElementById('certificate-id').value = '';
    document.getElementById('recipient-name').value = '';
    document.getElementById('issuer-name').value = '';
    document.getElementById('issue-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expiry-date').value = '';
    document.getElementById('certificate-type').value = 'Achievement';
    document.getElementById('certificate-image').value = '';
    document.getElementById('certificate-notes').value = '';
    
    // Clear image preview
    imagePreview.classList.remove('visible');
    previewPlaceholder.style.display = 'block';
    previewPlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Image preview will appear here</p>';
    
    showStatus('Form cleared', 'info');
});

// Upload certificate handler
uploadBtn.addEventListener('click', async () => {
    if (!currentUser) {
        showStatus('Please log in first', 'error');
        return;
    }

    // Get form values
    const certificateId = document.getElementById('certificate-id').value.trim();
    const recipientName = document.getElementById('recipient-name').value.trim();
    const issuerName = document.getElementById('issuer-name').value.trim();
    const issueDate = document.getElementById('issue-date').value;
    const expiryDate = document.getElementById('expiry-date').value;
    const certificateType = document.getElementById('certificate-type').value;
    const rawImageUrl = document.getElementById('certificate-image').value.trim();
    const notes = document.getElementById('certificate-notes').value.trim();

    // Validation
    if (!certificateId || !recipientName || !issuerName || !issueDate) {
        showStatus('Certificate ID, Recipient Name, Issuer Name, and Issue Date are required', 'error');
        return;
    }

    showStatus('Uploading certificate...', 'info');

    try {
        // Process Google Drive URL
        let imageUrl = rawImageUrl;
        if (rawImageUrl && rawImageUrl.includes('drive.google.com')) {
            const fileIdMatch = rawImageUrl.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
            if (fileIdMatch && fileIdMatch[1]) {
                imageUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
            }
        }

        // Create certificate data
        const certificateData = {
            certificateId: certificateId,
            recipientName: recipientName,
            issuerName: issuerName,
            issueDate: issueDate,
            expiryDate: expiryDate || null,
            type: certificateType,
            imageUrl: imageUrl || '',
            notes: notes || '',
            status: getCertificateStatus(issueDate, expiryDate),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.email,
            createdById: currentUser.uid
        };

        console.log("Uploading certificate:", certificateData);

        // Add to Firestore
        const docRef = await db.collection('certificates').add(certificateData);
        console.log("Certificate uploaded with ID:", docRef.id);

        // Clear form
        clearFormBtn.click();

        showStatus('Certificate uploaded successfully!', 'success');

        // Reload certificates
        loadCertificates();

    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`Upload failed: ${error.message}`, 'error');
        
        if (error.code === 'permission-denied') {
            showStatus('Permission denied - Check Firestore rules', 'error');
        }
    }
});

// Load certificates from Firestore
async function loadCertificates() {
    try {
        certificatesGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading certificates...</p>
            </div>
        `;

        const snapshot = await db.collection('certificates')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            certificatesGrid.innerHTML = `
                <div class="no-certificates">
                    <i class="fas fa-certificate"></i>
                    <p>No certificates found</p>
                    <button class="btn btn-primary" onclick="document.getElementById('certificate-id').focus()">
                        <i class="fas fa-plus"></i> Add Your First Certificate
                    </button>
                </div>
            `;
            allCertificates = [];
            return;
        }

        allCertificates = [];
        snapshot.forEach(doc => {
            allCertificates.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayCertificates(allCertificates);

    } catch (error) {
        console.error('Error loading certificates:', error);
        certificatesGrid.innerHTML = `
            <div class="no-certificates error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading certificates: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadCertificates()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Display certificates in grid
function displayCertificates(certificates) {
    if (certificates.length === 0) {
        certificatesGrid.innerHTML = `
            <div class="no-certificates">
                <i class="fas fa-search"></i>
                <p>No certificates match your search</p>
            </div>
        `;
        return;
    }

    let html = '';
    certificates.forEach(cert => {
        const status = cert.status || getCertificateStatus(cert.issueDate, cert.expiryDate);
        const isExpired = status === 'Expired';
        const imageUrl = cert.imageUrl || 'assets/images/certificate-placeholder.jpg';
        
        html += `
            <div class="certificate-card" data-id="${cert.id}">
                ${isExpired ? '<div class="certificate-ribbon">Expired</div>' : ''}
                <div class="certificate-image">
                    <img src="${imageUrl}" alt="${cert.certificateId}" loading="lazy">
                    <div class="certificate-overlay">
                        <button class="overlay-btn" onclick="viewCertificate('${cert.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="overlay-btn" onclick="copyCertificateLink('${cert.id}')" title="Copy Link">
                            <i class="fas fa-link"></i>
                        </button>
                        <button class="overlay-btn delete-btn" onclick="deleteCertificate('${cert.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="certificate-content">
                    <span class="certificate-id">${cert.certificateId}</span>
                    <h4 class="certificate-title">${cert.recipientName}</h4>
                    
                    <div class="certificate-details">
                        <div class="detail-item">
                            <i class="fas fa-building"></i>
                            <span><strong>Issued by:</strong> ${cert.issuerName}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span><strong>Issued:</strong> ${formatDate(cert.issueDate)}</span>
                        </div>
                        ${cert.expiryDate ? `
                        <div class="detail-item">
                            <i class="fas fa-calendar-times"></i>
                            <span><strong>Expires:</strong> ${formatDate(cert.expiryDate)}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <i class="fas fa-tag"></i>
                            <span><strong>Type:</strong> ${cert.type}</span>
                        </div>
                    </div>
                    
                    <div class="certificate-footer">
                        <div class="certificate-issuer">
                            <i class="fas fa-clock"></i>
                            <span>${timeAgo(cert.createdAt)}</span>
                        </div>
                        <a href="#" onclick="viewCertificate('${cert.id}'); return false;" class="view-certificate-link">
                            View Details <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    });

    certificatesGrid.innerHTML = html;
}

// View certificate details in modal
window.viewCertificate = async function(certId) {
    try {
        const doc = await db.collection('certificates').doc(certId).get();
        if (!doc.exists) {
            showStatus('Certificate not found', 'error');
            return;
        }

        const cert = doc.data();
        const status = cert.status || getCertificateStatus(cert.issueDate, cert.expiryDate);
        const imageUrl = cert.imageUrl || 'assets/images/certificate-placeholder.jpg';

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="certificate-view-image">
                <img src="${imageUrl}" alt="${cert.certificateId}">
            </div>
            
            <div class="certificate-info-grid">
                <div class="info-item">
                    <span class="label"><i class="fas fa-id-card"></i> Certificate ID</span>
                    <span class="value">${cert.certificateId}</span>
                </div>
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-user"></i> Issued To</span>
                    <span class="value">${cert.recipientName}</span>
                </div>
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-building"></i> Issued By</span>
                    <span class="value">${cert.issuerName}</span>
                </div>
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-calendar-alt"></i> Issue Date</span>
                    <span class="value">${formatDate(cert.issueDate)}</span>
                </div>
                
                ${cert.expiryDate ? `
                <div class="info-item">
                    <span class="label"><i class="fas fa-calendar-times"></i> Expiry Date</span>
                    <span class="value">${formatDate(cert.expiryDate)}</span>
                </div>
                ` : ''}
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-tag"></i> Type</span>
                    <span class="value">${cert.type}</span>
                </div>
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-info-circle"></i> Status</span>
                    <span class="value" style="color: ${status === 'Active' ? '#28a745' : status === 'Expired' ? '#dc3545' : '#ffc107'}">
                        ${status}
                    </span>
                </div>
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-clock"></i> Added</span>
                    <span class="value">${timeAgo(cert.createdAt)}</span>
                </div>
                
                <div class="info-item">
                    <span class="label"><i class="fas fa-user-circle"></i> Added By</span>
                    <span class="value">${cert.createdBy || 'Unknown'}</span>
                </div>
            </div>
            
            ${cert.notes ? `
            <div style="margin-top: 20px; padding: 20px; background: var(--gray-color); border-radius: 10px;">
                <h4 style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-sticky-note" style="color: var(--primary-color);"></i>
                    Additional Notes
                </h4>
                <p style="color: var(--text-color); line-height: 1.6; margin: 0;">${cert.notes}</p>
            </div>
            ` : ''}
            
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-secondary" onclick="copyCertificateInfo('${cert.certificateId}')">
                    <i class="fas fa-copy"></i> Copy Info
                </button>
                <button class="btn btn-primary" onclick="downloadCertificate('${cert.certificateId}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;

        modal.classList.add('active');

    } catch (error) {
        console.error('Error viewing certificate:', error);
        showStatus('Error loading certificate details', 'error');
    }
};

// Close modal
closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// Delete certificate
window.deleteCertificate = async function(certId) {
    if (!currentUser) {
        showStatus('Please log in first', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
        return;
    }

    try {
        await db.collection('certificates').doc(certId).delete();
        showStatus('Certificate deleted successfully', 'success');
        loadCertificates(); // Reload the list
    } catch (error) {
        console.error('Error deleting certificate:', error);
        showStatus('Error deleting certificate', 'error');
    }
};

// Copy certificate link
window.copyCertificateLink = function(certId) {
    const url = `${window.location.origin}/certificate-view.html?id=${certId}`;
    navigator.clipboard.writeText(url).then(() => {
        showStatus('Certificate link copied to clipboard!', 'success');
    }).catch(() => {
        showStatus('Failed to copy link', 'error');
    });
};

// Copy certificate info
window.copyCertificateInfo = function(certId) {
    // Find certificate from allCertificates
    const cert = allCertificates.find(c => c.certificateId === certId);
    if (!cert) return;

    const info = `
CERTIFICATE DETAILS
══════════════════════════════
Certificate ID: ${cert.certificateId}
Issued To: ${cert.recipientName}
Issued By: ${cert.issuerName}
Issue Date: ${formatDate(cert.issueDate)}
${cert.expiryDate ? `Expiry Date: ${formatDate(cert.expiryDate)}` : 'No Expiry'}
Type: ${cert.type}
Status: ${cert.status || getCertificateStatus(cert.issueDate, cert.expiryDate)}
Added: ${timeAgo(cert.createdAt)}
══════════════════════════════
    `.trim();

    navigator.clipboard.writeText(info).then(() => {
        showStatus('Certificate information copied!', 'success');
    });
};

// Download certificate (mock function - implement based on your needs)
window.downloadCertificate = function(certId) {
    const cert = allCertificates.find(c => c.certificateId === certId);
    if (cert && cert.imageUrl) {
        // Open image in new tab for downloading
        window.open(cert.imageUrl, '_blank');
        showStatus('Right-click on the image to save it', 'info');
    } else {
        showStatus('No image available for download', 'error');
    }
};

// Search functionality
searchInput.addEventListener('input', filterCertificates);
filterType.addEventListener('change', filterCertificates);

function filterCertificates() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const typeFilter = filterType.value;

    const filtered = allCertificates.filter(cert => {
        // Type filter
        if (typeFilter !== 'all' && cert.type !== typeFilter) {
            return false;
        }

        // Search filter
        if (searchTerm) {
            return (
                cert.certificateId.toLowerCase().includes(searchTerm) ||
                cert.recipientName.toLowerCase().includes(searchTerm) ||
                cert.issuerName.toLowerCase().includes(searchTerm) ||
                (cert.notes && cert.notes.toLowerCase().includes(searchTerm))
            );
        }

        return true;
    });

    displayCertificates(filtered);
}

// Refresh button
refreshBtn.addEventListener('click', () => {
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    loadCertificates().finally(() => {
        setTimeout(() => {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }, 500);
    });
});

// Helper Functions
function showStatus(message, type) {
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        
        // Auto hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusMessage.style.opacity = '0';
                setTimeout(() => {
                    statusMessage.style.opacity = '1';
                    statusMessage.textContent = '';
                    statusMessage.className = 'status-message';
                }, 300);
            }, 5000);
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function timeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }

    return 'Just now';
}

function getCertificateStatus(issueDate, expiryDate) {
    const today = new Date();
    const issue = new Date(issueDate);
    
    if (issue > today) {
        return 'Upcoming';
    }
    
    if (expiryDate) {
        const expiry = new Date(expiryDate);
        if (expiry < today) {
            return 'Expired';
        }
        
        // Check if expiring soon (within 30 days)
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
            return 'Expiring Soon';
        }
    }
    
    return 'Active';
}

// Add keyboard shortcut to focus search (Ctrl+K or Cmd+K)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
});