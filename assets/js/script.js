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
    
    // Search functionality
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
            if (searchTerm !== '') {
                // Remove previous highlights if any
                removeHighlights();
                
                // Highlight all matches on the page
                highlightMatches(searchTerm);
                
                // Scroll to first match
                scrollToFirstMatch(searchTerm);
            } else {
                removeHighlights();
            }
        }
        
        function highlightMatches(searchTerm) {
            // Only search within these elements to avoid affecting layout
            const searchableElements = document.querySelectorAll(
                'p, h1, h2, h3, h4, h5, h6, li, span:not(.search-highlight):not(.first-match), a, .article-title, .article-excerpt, .video-title, .video-desc'
            );
            
            searchableElements.forEach(element => {
                const originalHTML = element.innerHTML;
                const regex = new RegExp(searchTerm, 'gi');
                
                // Only process elements that actually contain the search term
                if (regex.test(element.textContent)) {
                    const highlightedHTML = originalHTML.replace(
                        regex,
                        match => `<span class="search-highlight">${match}</span>`
                    );
                    element.innerHTML = highlightedHTML;
                }
            });
        }
        
        function removeHighlights() {
            const highlights = document.querySelectorAll('.search-highlight, .first-match');
            highlights.forEach(highlight => {
                const parent = highlight.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                    parent.normalize();
                }
            });
        }
        
        function scrollToFirstMatch(searchTerm) {
            const searchableElements = document.querySelectorAll(
                'p, h1, h2, h3, h4, h5, h6, li, span:not(.search-highlight):not(.first-match), a, .article-title, .article-excerpt, .video-title, .video-desc'
            );
            
            for (let element of searchableElements) {
                if (element.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                    // Scroll to the element
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Highlight just this instance temporarily
                    const originalHTML = element.innerHTML;
                    const regex = new RegExp(searchTerm, 'gi');
                    element.innerHTML = originalHTML.replace(
                        regex,
                        match => `<span class="first-match">${match}</span>`
                    );
                    
                    // Remove temporary highlight after 2 seconds
                    setTimeout(() => {
                        const firstMatches = element.querySelectorAll('.first-match');
                        firstMatches.forEach(match => {
                            const parent = match.parentNode;
                            if (parent) {
                                parent.replaceChild(document.createTextNode(match.textContent), match);
                                parent.normalize();
                            }
                        });
                        
                        // Re-apply permanent highlights
                        highlightMatches(searchTerm);
                    }, 2000);
                    
                    break;
                }
            }
        }
    }
    
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