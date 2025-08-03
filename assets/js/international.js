document.addEventListener('DOMContentLoaded', function() {
    console.log("international.js loaded - starting execution");
    
    try {
        if (!firebase || !firebase.apps.length) {
            throw new Error('Firebase not initialized!');
        }

        const db = firebase.firestore();
        console.log("Firestore initialized successfully");

        let currentPage = 1;
        const articlesPerPage = 6;
        let allInternationalArticles = [];
        let hasMore = true;
        
        const elements = {
            container: document.getElementById('all-articles-container'),
            prevBtn: document.getElementById('prev-page'),
            nextBtn: document.getElementById('next-page'),
            pageInfo: document.getElementById('page-info')
        };

        // Initial load
        loadAllArticles();
        
        // Event listeners
        elements.prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });
        
        elements.nextBtn.addEventListener('click', () => {
            if (hasMore) {
                currentPage++;
                renderPage();
            }
        });

        async function loadAllArticles() {
            showLoadingState();
            
            try {
                // Simple query without composite filters
                const querySnapshot = await db.collection('articles')
                    .where('published', '==', true)
                    .orderBy('createdAt', 'desc')
                    .get();

                // Filter client-side for International News
                allInternationalArticles = querySnapshot.docs
                    .filter(doc => doc.data().category === 'International News')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                console.log(`Found ${allInternationalArticles.length} international articles`);
                
                if (allInternationalArticles.length === 0) {
                    handleEmptyResults(1);
                    return;
                }
                
                renderPage();
                
            } catch (error) {
                handleQueryError(error);
            }
        }
        
        function renderPage() {
            const startIdx = (currentPage - 1) * articlesPerPage;
            const endIdx = startIdx + articlesPerPage;
            const pageArticles = allInternationalArticles.slice(startIdx, endIdx);
            
            displayArticles(pageArticles);
            updatePaginationState();
        }
        
        function showLoadingState() {
            elements.container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i> Loading international news...
                </div>
            `;
        }
        
        function displayArticles(articles) {
            elements.container.innerHTML = '';
            
            if (articles.length === 0) {
                handleEmptyResults(currentPage);
                return;
            }
            
            articles.forEach(article => {
                console.log("Displaying article:", article.title);
                elements.container.appendChild(createArticleCard(article));
            });
        }
        
        function createArticleCard(article) {
            const card = document.createElement('div');
            card.className = 'article-card';
            card.innerHTML = `
                <div class="article-image">
                    <img src="${article.imageUrl || 'assets/images/placeholder.jpg'}" 
                         alt="${article.title}">
                </div>
                <div class="article-content">
                    <span class="article-category">${article.category}</span>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt || ''}</p>
                    <div class="article-meta">
                        <span><i class="fas fa-clock"></i> ${getReadTime(article.content)} min read</span>
                        <a href="article.html?id=${article.id}" class="read-more">
                            Read More <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
            return card;
        }
        
        function updatePaginationState() {
            const totalPages = Math.ceil(allInternationalArticles.length / articlesPerPage);
            hasMore = currentPage < totalPages;
            
            elements.prevBtn.disabled = currentPage === 1;
            elements.nextBtn.disabled = !hasMore;
            elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }
        
        function handleEmptyResults(page) {
            elements.container.innerHTML = page === 1 
                ? '<p>No international news articles found.</p>' 
                : '<p>No more international news articles to show.</p>';
            hasMore = false;
        }
        
        function handleQueryError(error) {
            console.error("Error loading articles:", error);
            elements.container.innerHTML = `
                <div class="error-message">
                    Error loading articles: ${error.message}
                </div>
            `;
        }
        
        function getReadTime(content) {
            if (!content) return 0;
            const wordCount = content.split(/\s+/).length;
            return Math.ceil(wordCount / 200);
        }

    } catch (initError) {
        console.error("Initialization failed:", initError);
        const container = document.getElementById('all-articles-container') || document.body;
        container.innerHTML = `
            <div class="error-message">
                System initialization failed: ${initError.message}
            </div>
        `;
    }
});