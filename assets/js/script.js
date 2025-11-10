document.addEventListener('DOMContentLoaded', function() {
    // Theme management with session storage
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    
    // Check for saved theme preference in sessionStorage
    const savedTheme = sessionStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    // Theme toggle functionality
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Set the new theme
            body.setAttribute('data-theme', newTheme);
            
            // Save to sessionStorage
            sessionStorage.setItem('theme', newTheme);
            
            // Update the icon
            updateThemeIcon(newTheme);
        });
    }
    
    // Function to update the theme icon based on current theme
    function updateThemeIcon(theme) {
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('i');
        if (!icon) return;
        
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger) hamburger.classList.remove('active');
            if (navLinks) navLinks.classList.remove('active');
        });
    });
    
    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
    
    // Smooth scrolling for all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
// Search functionality - 10-11-25
const searchButton = document.querySelector('.search-button');
const searchInput = document.querySelector('.search-input');

if (searchButton && searchInput) {
    // Click handler for search button
    searchButton.addEventListener('click', function() {
        performSearch();
    });
    
    // Enter key handler for search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm !== '' && searchTerm.length >= 2) {
            // Remove previous highlights if any
            removeHighlights();
            
            // Highlight all matches on the page
            const matchesFound = highlightMatches(searchTerm);
            
            if (matchesFound) {
                // Scroll to first match
                scrollToFirstMatch(searchTerm);
                showSearchFeedback(`${matchesFound} matches found for "${searchTerm}"`);
            } else {
                showSearchFeedback(`No matches found for "${searchTerm}"`, true);
            }
        } else if (searchTerm.length < 2 && searchTerm.length > 0) {
            showSearchFeedback('Please enter at least 2 characters to search', true);
        } else {
            removeHighlights();
            hideSearchFeedback();
        }
    }
    
    function highlightMatches(searchTerm) {
        let matchCount = 0;
        
        // Define elements to search in (exclude code, scripts, and interactive elements)
        const searchableElements = document.querySelectorAll(`
            .article-title, .article-excerpt, .article-content p,
            .video-title, .video-desc, .section-description,
            h1, h2, h3, h4, h5, h6, 
            p:not(.no-search), 
            li:not(.no-search),
            .card-content:not(.no-search) *
        `);
        
        // Elements to exclude from search
        const excludedSelectors = [
            'script', 'style', 'code', 'pre', '.no-search',
            '.search-highlight', '.first-match',
            'nav', 'footer', '.navbar', '.search-container'
        ];
        
        searchableElements.forEach(element => {
            // Skip if element is inside excluded container
            if (element.closest(excludedSelectors.join(', '))) {
                return;
            }
            
            // Skip if element is empty or only contains whitespace
            if (!element.textContent || element.textContent.trim().length === 0) {
                return;
            }
            
            const originalHTML = element.innerHTML;
            const textContent = element.textContent;
            const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
            
            // Check if element contains the search term
            if (regex.test(textContent)) {
                matchCount++;
                
                // Create highlighted version
                const highlightedHTML = originalHTML.replace(
                    regex,
                    match => `<span class="search-highlight" data-search-match="true">${match}</span>`
                );
                
                // Only update if content actually changed
                if (highlightedHTML !== originalHTML) {
                    element.innerHTML = highlightedHTML;
                }
            }
        });
        
        return matchCount;
    }
    
    function removeHighlights() {
        const highlights = document.querySelectorAll('.search-highlight, .first-match');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            if (parent) {
                // Replace highlight with just text content
                const textNode = document.createTextNode(highlight.textContent);
                parent.replaceChild(textNode, highlight);
                
                // Clean up any empty text nodes
                parent.normalize();
            }
        });
    }
    
    function scrollToFirstMatch(searchTerm) {
        const firstHighlight = document.querySelector('.search-highlight[data-search-match="true"]');
        if (firstHighlight) {
            // Remove any existing first-match classes
            document.querySelectorAll('.first-match').forEach(el => {
                el.classList.remove('first-match');
            });
            
            // Add special class to first match
            firstHighlight.classList.add('first-match');
            
            // Scroll to first match
            setTimeout(() => {
                firstHighlight.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }, 100);
        }
    }
    
    function showSearchFeedback(message, isError = false) {
        // Remove existing feedback if any
        hideSearchFeedback();
        
        const feedback = document.createElement('div');
        feedback.className = `search-feedback ${isError ? 'error' : 'success'}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 12px 20px;
            background: ${isError ? '#f8d7da' : '#d1edff'};
            color: ${isError ? '#721c24' : '#004085'};
            border: 1px solid ${isError ? '#f5c6cb' : '#b8daff'};
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 300px;
        `;
        
        document.body.appendChild(feedback);
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            hideSearchFeedback();
        }, 3000);
    }
    
    function hideSearchFeedback() {
        const existingFeedback = document.querySelector('.search-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
    }
    
    // Helper function to escape regex special characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Clear search when input is cleared
    searchInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            removeHighlights();
            hideSearchFeedback();
        }
    });
    
    // Add CSS for search highlights
    if (!document.querySelector('#search-styles')) {
        const searchStyles = document.createElement('style');
        searchStyles.id = 'search-styles';
        searchStyles.textContent = `
            .search-highlight {
                background-color: #ffeb3b;
                color: #000;
                padding: 2px 4px;
                border-radius: 3px;
                font-weight: bold;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            
            .first-match {
                background-color: #ff9800 !important;
                color: #000 !important;
                animation: pulse 2s ease-in-out;
                box-shadow: 0 2px 8px rgba(255, 152, 0, 0.5);
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .search-feedback {
                transition: all 0.3s ease;
            }
            
            .search-feedback.success {
                border-left: 4px solid #28a745;
            }
            
            .search-feedback.error {
                border-left: 4px solid #dc3545;
            }
        `;
        document.head.appendChild(searchStyles);
    }
}

// Add this to your existing smooth scrolling to exclude search highlights
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            // Remove any active search highlights before scrolling
            removeHighlights();
            
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});
    
    // Set initial state for animated elements
    document.querySelectorAll('.video-card, .article-card').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Animation on scroll
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.video-card, .article-card');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Initialize scroll animation
    window.addEventListener('scroll', animateOnScroll);
    window.addEventListener('load', animateOnScroll);
    animateOnScroll(); // Initial call

    // Function to load articles from Firebase
    async function loadArticles() {
        try {
            // Check if Firebase is initialized
            if (!firebase || !firebase.apps.length) {
                console.error('Firebase not initialized');
                return;
            }

            const db = firebase.firestore();
            const articlesSnapshot = await db.collection('articles')
                .where('published', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();
            
            const articlesGrid = document.querySelector('.article-grid');
            if (!articlesGrid) return;
            
            articlesGrid.innerHTML = '';
            
            if (articlesSnapshot.empty) {
                articlesGrid.innerHTML = '<p>No articles found</p>';
                return;
            }
            
            articlesSnapshot.forEach(doc => {
                const article = doc.data();
                const articleId = doc.id;
                
                const articleCard = document.createElement('div');
                articleCard.className = 'article-card';
                articleCard.innerHTML = `
                    <div class="article-image">
                        <img src="${article.imageUrl || 'assets/images/placeholder.jpg'}" alt="${article.title}">
                    </div>
                    <div class="article-content">
                        <span class="article-category">${article.category || 'General'}</span>
                        <h3 class="article-title">${article.title}</h3>
                        <p class="article-excerpt">${article.excerpt || article.content.substring(0, 150)}...</p>
                        <div class="article-meta">
                            <span><i class="fas fa-clock"></i> ${Math.ceil(article.content.length / 1000)} min read</span>
                            <a href="article.html?id=${articleId}" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                `;
                
                articlesGrid.appendChild(articleCard);
            });
            
            animateOnScroll();
        } catch (error) {
            console.error('Error loading articles:', error);
            const articlesGrid = document.querySelector('.article-grid');
            if (articlesGrid) {
                articlesGrid.innerHTML = `<p class="error">Error loading articles: ${error.message}</p>`;
            }
        }
    }

    // Load articles
    loadArticles();

});
