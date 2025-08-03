document.addEventListener('DOMContentLoaded', function() {
    // Check if Firebase is initialized
    if (!firebase.apps.length) {
        console.error("Firebase not initialized!");
        return;
    }
    
    const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function() {
    const db = firebase.firestore();
    let currentPage = 1;
    const articlesPerPage = 6;
    let lastVisible = null;
    let hasMore = true;
    
    const allArticlesContainer = document.getElementById('all-articles-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    // Load first page
    loadPage(currentPage);
    
    // Pagination controls
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadPage(currentPage);
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        if (hasMore) {
            currentPage++;
            loadPage(currentPage);
        }
    });
    
    function loadPage(page) {
        allArticlesContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading articles...</div>';
        
        let articlesQuery = db.collection('articles')
                            .where('published', '==', true)
                            .orderBy('publishedDate', 'desc')
                            .limit(articlesPerPage);
        
        if (page > 1 && lastVisible) {
            articlesQuery = articlesQuery.startAfter(lastVisible);
        }
        
        articlesQuery.get().then((querySnapshot) => {
            allArticlesContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                if (page === 1) {
                    allArticlesContainer.innerHTML = '<p>No articles found.</p>';
                } else {
                    allArticlesContainer.innerHTML = '<p>No more articles to show.</p>';
                    hasMore = false;
                }
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const article = doc.data();
                const articleId = doc.id;
                
                const articleCard = document.createElement('div');
                articleCard.className = 'article-card';
                articleCard.innerHTML = `
                    <div class="article-image">
                        <img src="${article.imageUrl || 'assets/images/default-article.jpg'}" alt="${article.title}">
                    </div>
                    <div class="article-content">
                        <span class="article-category">${article.category || 'General'}</span>
                        <h3 class="article-title">${article.title}</h3>
                        <p class="article-excerpt">${article.excerpt || ''}</p>
                        <div class="article-meta">
                            <span><i class="fas fa-clock"></i> ${getReadTime(article.content)} min read</span>
                            <a href="article.html?id=${articleId}" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                `;
                
                allArticlesContainer.appendChild(articleCard);
            });
            
            // Update pagination state
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            hasMore = querySnapshot.docs.length === articlesPerPage;
            
            prevPageBtn.disabled = page === 1;
            nextPageBtn.disabled = !hasMore;
            pageInfo.textContent = `Page ${page}`;
        }).catch((error) => {
            console.error("Error getting articles: ", error);
            allArticlesContainer.innerHTML = '<p>Error loading articles. Please try again later.</p>';
        });
    }
    
    function getReadTime(content) {
        // Simple read time calculation (200 words per minute)
        const wordCount = content.split(/\s+/).length;
        return Math.ceil(wordCount / 200);
    }
});