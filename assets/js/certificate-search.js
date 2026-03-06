// Certificate Search Functionality
class CertificateSearch {
    constructor() {
        console.log('CertificateSearch initializing...');
        
        this.db = firebase.firestore();
        this.recentSearches = JSON.parse(localStorage.getItem('recentCertificateSearches')) || [];
        
        this.initializeDOMElements();
        this.initializeEventListeners();
        this.updateRecentSearches();
        this.initializeTheme();
        
        // Check URL for certificate ID on page load
        console.log('Checking URL for certificate ID...');
        this.checkUrlForCertificate();
    }

    // Method to check URL parameters
    checkUrlForCertificate() {
        console.log('Current URL:', window.location.href);
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        let certId = urlParams.get('id');
        
        console.log('Certificate ID from URL:', certId);
        
        if (certId) {
            console.log('Found certificate ID in URL:', certId);
            
            // Auto-populate search box
            if (this.searchInput) {
                this.searchInput.value = certId;
                console.log('Search input populated');
                
                // Trigger search
                setTimeout(() => {
                    console.log('Triggering search for:', certId);
                    this.searchCertificate(certId);
                }, 500); // Increased delay to ensure everything is loaded
            } else {
                console.error('Search input not found!');
            }
        } else {
            console.log('No certificate ID found in URL');
        }
    }

    initializeDOMElements() {
        console.log('Initializing DOM elements...');
        
        // Search elements
        this.searchInput = document.getElementById('certificate-search');
        console.log('Search input:', this.searchInput);
        
        // State elements
        this.initialState = document.getElementById('initial-state');
        this.loadingState = document.getElementById('loading-state');
        this.resultFound = document.getElementById('result-found');
        this.notFoundState = document.getElementById('not-found-state');
        
        // Result elements
        this.searchedIdSpan = document.getElementById('searched-id');
        
        // Recent searches elements
        this.recentSearchesDiv = document.getElementById('recent-searches');
        this.recentTagsDiv = document.getElementById('recent-tags');
        
        // Modal elements
        this.imageModal = document.getElementById('image-modal');
        this.zoomedImage = document.getElementById('zoomed-image');
        
        console.log('Initial state element:', this.initialState);
        console.log('Loading state element:', this.loadingState);
        console.log('Result found element:', this.resultFound);
        console.log('Not found element:', this.notFoundState);
    }

    initializeEventListeners() {
        // Search on Enter key
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const certId = this.searchInput.value.trim();
                    if (certId) {
                        this.searchCertificate(certId);
                    }
                }
            });
        }

        // Close modal when clicking outside
        if (this.imageModal) {
            this.imageModal.addEventListener('click', (e) => {
                if (e.target === this.imageModal) {
                    this.closeImageModal();
                }
            });
        }
    }

    // ===== State Management =====
    showInitialState() {
        console.log('Showing initial state');
        if (this.initialState) this.initialState.style.display = 'block';
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.resultFound) this.resultFound.style.display = 'none';
        if (this.notFoundState) this.notFoundState.style.display = 'none';
    }

    showLoadingState() {
        console.log('Showing loading state');
        if (this.initialState) this.initialState.style.display = 'none';
        if (this.loadingState) this.loadingState.style.display = 'block';
        if (this.resultFound) this.resultFound.style.display = 'none';
        if (this.notFoundState) this.notFoundState.style.display = 'none';
    }

    // ===== Recent Searches =====
    updateRecentSearches() {
        if (this.recentSearches.length > 0 && this.recentSearchesDiv && this.recentTagsDiv) {
            this.recentSearchesDiv.style.display = 'block';
            this.recentTagsDiv.innerHTML = this.recentSearches.map(id => 
                `<span class="recent-tag" onclick="certificateSearch.searchCertificate('${id}')">${id}</span>`
            ).join('');
        } else if (this.recentSearchesDiv) {
            this.recentSearchesDiv.style.display = 'none';
        }
    }

    addToRecentSearches(certId) {
        this.recentSearches = [certId, ...this.recentSearches.filter(id => id !== certId)].slice(0, 5);
        localStorage.setItem('recentCertificateSearches', JSON.stringify(this.recentSearches));
        this.updateRecentSearches();
    }

    // ===== Certificate Search =====
    async searchCertificate(certId) {
        console.log('searchCertificate called with:', certId);
        
        if (!certId) {
            console.log('No certificate ID provided');
            return;
        }
        
        this.showLoadingState();
        
        try {
            console.log('Searching Firestore for:', certId);
            
            // Search in certificates collection
            const snapshot = await this.db.collection('certificates')
                .where('certificateId', '==', certId)
                .limit(1)
                .get();

            console.log('Search complete. Empty?', snapshot.empty);

            if (snapshot.empty) {
                console.log('Certificate not found:', certId);
                this.showNotFound(certId);
                return;
            }

            // Certificate found
            const doc = snapshot.docs[0];
            const cert = doc.data();
            console.log('Certificate found:', cert);
            this.displayCertificate(cert);

        } catch (error) {
            console.error('Search error:', error);
            alert('Error searching for certificate. Please check console for details.');
            this.showInitialState();
        }
    }

    showNotFound(certId) {
        if (this.searchedIdSpan) {
            this.searchedIdSpan.textContent = certId;
        }
        if (this.initialState) this.initialState.style.display = 'none';
        if (this.loadingState) this.loadingState.style.display = 'none';
        if (this.resultFound) this.resultFound.style.display = 'none';
        if (this.notFoundState) this.notFoundState.style.display = 'block';
    }

    // ===== Google Drive Image URL Processing =====
    processGoogleDriveUrl(url) {
        console.log('Processing URL:', url);
        
        if (!url) {
            return {
                thumbnail: 'assets/images/certificate-placeholder.jpg',
                view: 'assets/images/certificate-placeholder.jpg',
                download: 'assets/images/certificate-placeholder.jpg',
                fileId: null
            };
        }
        
        // Handle different Google Drive URL formats
        if (url.includes('drive.google.com')) {
            let fileId = null;
            
            // Pattern 1: /file/d/FILE_ID/view
            const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
                fileId = fileIdMatch[1];
                console.log('Extracted fileId (pattern 1):', fileId);
            }
            
            // Pattern 2: id=FILE_ID
            if (!fileId) {
                const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (idMatch) {
                    fileId = idMatch[1];
                    console.log('Extracted fileId (pattern 2):', fileId);
                }
            }
            
            if (fileId) {
                return {
                    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
                    view: `https://drive.google.com/uc?export=view&id=${fileId}`,
                    download: `https://drive.google.com/uc?export=download&id=${fileId}`,
                    fileId: fileId
                };
            }
        }
        
        // Return original URL if not a Google Drive link
        return {
            thumbnail: url,
            view: url,
            download: url,
            fileId: null
        };
    }

    // ===== Display Certificate =====
    displayCertificate(cert) {
        console.log('Displaying certificate:', cert);
        
        const status = cert.status || this.getCertificateStatus(cert.issueDate, cert.expiryDate);
        
        // Process image URL
        const imageUrls = this.processGoogleDriveUrl(cert.imageUrl);
        const thumbnailUrl = imageUrls.thumbnail;
        const viewUrl = imageUrls.view;
        const fileId = imageUrls.fileId;

        // Add to recent searches
        this.addToRecentSearches(cert.certificateId);

        // Build result HTML
        if (this.resultFound) {
            this.resultFound.innerHTML = `
                <div class="result-header">
                    <i class="fas fa-certificate"></i>
                    <h2>Certificate Verified</h2>
                </div>
                <div class="result-body">
                    <div class="certificate-display">
                        <div class="certificate-image-section">
                            <div class="image-container">
                                <img src="${thumbnailUrl}" 
                                     alt="${cert.certificateId}" 
                                     onerror="this.onerror=null; this.src='${viewUrl}'; this.onerror=function(){this.src='assets/images/certificate-placeholder.jpg';}"
                                     onclick="certificateSearch.openImageModal('${viewUrl}')"
                                     title="Click to zoom"
                                     style="max-width: 100%; max-height: 300px; object-fit: contain;">
                            </div>
                            <p><i class="fas fa-search-plus"></i> Click image to zoom</p>
                        </div>
                        
                        <div class="certificate-details-section">
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-id-card"></i> Certificate ID</div>
                                <div class="detail-value">${cert.certificateId}</div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-user"></i> Issued To</div>
                                <div class="detail-value">${cert.recipientName}</div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-building"></i> Issued By</div>
                                <div class="detail-value">${cert.issuerName}</div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-calendar-alt"></i> Issue Date</div>
                                <div class="detail-value">${this.formatDate(cert.issueDate)}</div>
                            </div>
                            
                            ${cert.expiryDate ? `
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-calendar-times"></i> Expiry Date</div>
                                <div class="detail-value">${this.formatDate(cert.expiryDate)}</div>
                            </div>
                            ` : ''}
                            
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-tag"></i> Type</div>
                                <div class="detail-value">${cert.type}</div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-label"><i class="fas fa-info-circle"></i> Status</div>
                                <div class="detail-value">
                                    <span class="status-badge ${this.getStatusBadgeClass(status)}">${status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-btn download" onclick="certificateSearch.downloadCertificate('${cert.certificateId}', '${cert.imageUrl}')">
                            <i class="fas fa-download"></i> Download Certificate
                        </button>
                        <button class="action-btn search" onclick="certificateSearch.clearAndSearch()">
                            <i class="fas fa-search"></i> Search Another
                        </button>
                    </div>
                </div>
            `;

            // Show result
            if (this.initialState) this.initialState.style.display = 'none';
            if (this.loadingState) this.loadingState.style.display = 'none';
            if (this.resultFound) this.resultFound.style.display = 'block';
            if (this.notFoundState) this.notFoundState.style.display = 'none';
        }
    }

    // ===== Download Certificate Image =====
    async downloadCertificate(certId, originalImageUrl) {
        try {
            const downloadBtn = event.target.closest('.action-btn');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            downloadBtn.disabled = true;

            const processed = this.processGoogleDriveUrl(originalImageUrl);
            let downloadUrl = originalImageUrl;
            
            if (processed.fileId) {
                downloadUrl = `https://drive.google.com/uc?export=download&id=${processed.fileId}`;
            }

            window.open(downloadUrl, '_blank');
            
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;

        } catch (error) {
            console.error('Download error:', error);
            alert('Error downloading certificate. Please try again.');
        }
    }

    // ===== Helper Methods =====
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getCertificateStatus(issueDate, expiryDate) {
        const today = new Date();
        const issue = new Date(issueDate);
        
        if (issue > today) return 'Upcoming';
        
        if (expiryDate) {
            const expiry = new Date(expiryDate);
            if (expiry < today) return 'Expired';
            
            const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 30) return 'Expiring Soon';
        }
        
        return 'Active';
    }

    getStatusBadgeClass(status) {
        switch(status) {
            case 'Active': return 'active';
            case 'Expired': return 'expired';
            case 'Expiring Soon': return 'expiring-soon';
            case 'Upcoming': return 'upcoming';
            default: return 'active';
        }
    }

    // ===== Image Modal =====
    openImageModal(imgSrc) {
        if (this.zoomedImage && this.imageModal) {
            this.zoomedImage.src = imgSrc;
            this.imageModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeImageModal() {
        if (this.imageModal) {
            this.imageModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ===== Utility Methods =====
    clearAndSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.focus();
        }
        this.showInitialState();
    }

    // ===== Theme Management =====
    initializeTheme() {
        const savedTheme = sessionStorage.getItem('theme');
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        }

        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.setAttribute('data-theme', newTheme);
        sessionStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // ===== Mobile Menu =====
    initializeMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating CertificateSearch instance');
    window.certificateSearch = new CertificateSearch();
});
