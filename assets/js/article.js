// Function to update meta tags for social sharing
function updateMetaTags(article) {
    const baseUrl = window.location.origin;
    const currentUrl = window.location.href;
    
    // Process image URL for social media
    let imageUrl = article.imageUrl || baseUrl + '/assets/images/logo.png';
    
    // Convert Google Drive URL to embeddable format
    if (imageUrl.includes('drive.google.com')) {
        const fileId = imageUrl.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
        if (fileId && fileId[1]) {
            imageUrl = 'https://drive.google.com/thumbnail?id=' + fileId[1] + '&sz=w1000';
        }
    }
    
    // Make sure image URL is absolute
    if (!imageUrl.startsWith('http')) {
        imageUrl = baseUrl + '/' + imageUrl;
    }
    
    // Create description from excerpt or content
    let description = article.excerpt || article.content || 'Read this article on Vastavikta';
    description = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
    description = description.substring(0, 160) + (description.length > 160 ? '...' : '');
    
    // Create title
    const title = article.title + ' - Vastavikta';
    
    // Update Open Graph tags
    document.getElementById('og-url').content = currentUrl;
    document.getElementById('og-title').content = title;
    document.getElementById('og-description').content = description;
    document.getElementById('og-image').content = imageUrl;
    
    // Update Twitter Card tags
    document.getElementById('twitter-title').content = title;
    document.getElementById('twitter-description').content = description;
    document.getElementById('twitter-image').content = imageUrl;
    document.getElementById('twitter-image-alt').content = article.title;
    
    // Update standard meta tags
    document.getElementById('meta-description').content = description;
    document.getElementById('page-title').textContent = title;
    document.getElementById('meta-keywords').content = article.category ? 'news, ' + article.category + ', vastavikta' : 'news, article, vastavikta';
    
    // Update article specific meta tags
    const now = new Date().toISOString();
    document.getElementById('article-published').content = article.createdAt || now;
    document.getElementById('article-modified').content = now;
    document.getElementById('article-section').content = article.category || 'News';
    
    // Update canonical URL
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = currentUrl;
}

// Function to format date
function formatDate(dateString) {
    if (!dateString) return 'Recently';
    
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return diffDays + ' days ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
    if (diffDays < 365) return Math.floor(diffDays / 30) + ' months ago';
    
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Function to process image URL
function processImageUrl(imageUrl) {
    if (!imageUrl) return null;
    
    let processedUrl = imageUrl;
    
    // Convert Google Drive URL to embeddable format
    if (processedUrl.includes('drive.google.com')) {
        const fileId = processedUrl.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
        if (fileId && fileId[1]) {
            processedUrl = 'https://drive.google.com/thumbnail?id=' + fileId[1] + '&sz=w1000';
        }
    }
    
    return processedUrl;
}

// Function to load related articles
async function loadRelatedArticles(currentArticleId, category) {
    try {
        const relatedArticlesContainer = document.getElementById('related-articles-container');
        const relatedArticlesSection = document.getElementById('related-articles');
        
        if (!relatedArticlesContainer || !category) return;
        
        // Get 3 related articles from the same category
        const querySnapshot = await db.collection('articles')
            .where('category', '==', category)
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(4) // Get 4 to exclude current article
            .get();
        
        const relatedArticles = [];
        querySnapshot.forEach(function(doc) {
            if (doc.id !== currentArticleId && relatedArticles.length < 3) {
                relatedArticles.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });
        
        if (relatedArticles.length > 0) {
            let relatedHTML = '';
            relatedArticles.forEach(function(article) {
                const excerpt = article.excerpt || (article.content ? article.content.substring(0, 100) + '...' : '');
                const imageHTML = article.imageUrl ? 
                    '<div class="article-image"><img src="' + processImageUrl(article.imageUrl) + '" alt="' + article.title + '" onerror="this.onerror=null;this.src=\'assets/images/placeholder.jpg\'"></div>' : '';
                
                relatedHTML += `
                <div class="article-card">
                    <a href="article.html?id=${article.id}" class="article-link">
                        ${imageHTML}
                        <div class="article-content">
                            <span class="article-category">${article.category || 'General'}</span>
                            <h3 class="article-title">${article.title}</h3>
                            <p class="article-excerpt">${excerpt}</p>
                            <div class="article-meta">
                                <span><i class="fas fa-eye"></i> ${article.views || 0} views</span>
                                <span><i class="fas fa-calendar"></i> ${formatDate(article.createdAt)}</span>
                            </div>
                        </div>
                    </a>
                </div>
                `;
            });
            
            relatedArticlesContainer.innerHTML = relatedHTML;
            relatedArticlesSection.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading related articles:', error);
    }
}

// Social Sharing Functions
function shareOnWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    window.open('https://wa.me/?text=' + text + '%20' + url, '_blank');
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank');
}

function copyArticleLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(function() {
        // Show temporary feedback
        const copyBtn = document.querySelector('.share-btn.copy-link');
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.backgroundColor = '#28a745';
        
        setTimeout(function() {
            copyBtn.innerHTML = originalHtml;
            copyBtn.style.backgroundColor = '#6c757d';
        }, 2000);
    }).catch(function(err) {
        console.error('Failed to copy: ', err);
        alert('Failed to copy link to clipboard');
    });
}

// Main article loading function
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
        window.location.href = 'index.html';
        return;
    }
    
    const articleContent = document.getElementById('article-content');
    const socialShareSection = document.getElementById('social-share');
    
    try {
        const articleDoc = await db.collection('articles').doc(articleId).get();
        
        if (!articleDoc.exists) {
            throw new Error('Article not found');
        }
        
        const article = {
            id: articleDoc.id,
            ...articleDoc.data()
        };
        
        // Update meta tags for social sharing
        updateMetaTags(article);
        
        // Process image URL
        const imageUrl = processImageUrl(article.imageUrl);
        
        // Build article HTML
        let articleHTML = `
            <article class="article-full">
                <div class="article-header">
                    <h1 class="article-title">${article.title}</h1>
                </div>`;
        
        if (imageUrl) {
            articleHTML += `
                <div class="article-featured-image">
                    <img src="${imageUrl}" 
                         alt="${article.title}"
                         onerror="this.onerror=null;this.src='assets/images/placeholder.jpg'">
                </div>`;
        }
        
        articleHTML += `
                <div class="article-body">
                    ${article.content || '<p>No content available for this article.</p>'}
                    <div class="article-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(article.createdAt)}</span>
                        <span><i class="fas fa-clock"></i> ${article.readTime || '5'} min read</span>
                    </div>
                </div>`;
        
        if (article.tags) {
            let tagsHTML = '';
            article.tags.split(',').forEach(function(tag) {
                tagsHTML += '<span class="tag">' + tag.trim() + '</span>';
            });
            
            articleHTML += `
                <div class="article-tags">
                    <strong>Tags:</strong>
                    ${tagsHTML}
                </div>`;
        }
        
        articleHTML += '</article>';
        
        // Display article
        articleContent.innerHTML = articleHTML;
        
        // Show social sharing buttons
        socialShareSection.style.display = 'flex';
        
        // Load related articles
        if (article.category) {
            loadRelatedArticles(articleId, article.category);
        }
        
        // Update view count
        try {
            await db.collection('articles').doc(articleId).update({
                views: firebase.firestore.FieldValue.increment(1),
                lastViewed: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (updateError) {
            console.log("View count update failed:", updateError);
        }
        
    } catch (error) {
        console.error('Error loading article:', error);
        articleContent.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 50px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                <h2>Article Not Found</h2>
                <p style="margin-bottom: 30px; color: var(--text-light);">${error.message}</p>
                <a href="index.html" class="btn btn-primary">Return to Homepage</a>
            </div>
        `;
    }
});

// Add CSS styles
const additionalStyles = `
    .loading-spinner {
        text-align: center;
        padding: 50px 20px;
        color: var(--text-light);
    }
    
    .loading-spinner i {
        font-size: 2rem;
        margin-bottom: 15px;
    }
    
    .article-full {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .article-header {
        text-align: center;
        margin-bottom: 40px;
    }
    
    .article-meta {
        display: flex;
        justify-content: center;
        gap: 20px;
        color: var(--text-light);
        font-size: 0.9rem;
        margin-top: 15px;
    }
    
    .article-meta span {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .article-featured-image {
        margin: 30px 0;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: var(--shadow);
    }
    
    .article-featured-image img {
        width: 100%;
        height: auto;
        display: block;
    }
    
    .article-body {
        line-height: 1.8;
        font-size: 1.1rem;
    }
    
    .article-body p {
        margin-bottom: 25px;
    }
    
    .article-body img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 20px 0;
    }
    
    .article-body h2,
    .article-body h3 {
        margin-top: 40px;
        margin-bottom: 20px;
        color: var(--dark-color);
    }
    
    .article-body blockquote {
        border-left: 4px solid var(--primary-color);
        padding-left: 20px;
        margin: 30px 0;
        font-style: italic;
        color: var(--text-light);
    }
    
    .article-body ul,
    .article-body ol {
        margin: 20px 0;
        padding-left: 30px;
    }
    
    .article-body li {
        margin-bottom: 10px;
    }
    
    .article-tags {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
    }
    
    .tag {
        display: inline-block;
        background-color: var(--gray-color);
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        margin: 5px;
        color: var(--text-color);
    }
    
    .related-articles {
        margin-top: 60px;
        padding-top: 40px;
        border-top: 1px solid #eee;
    }
    
    .related-articles h3 {
        margin-bottom: 30px;
        text-align: center;
        color: var(--dark-color);
    }
    
    .social-share {
        display: none;
        align-items: center;
        gap: 15px;
        margin-top: 40px;
        padding-top: 30px;
        border-top: 1px solid #eee;
        flex-wrap: wrap;
    }
    
    .social-share span {
        font-weight: 600;
        color: var(--text-color);
        margin-right: 10px;
    }
    
    .share-btn {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        border: none;
        color: white;
        font-size: 1.1rem;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .share-btn:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow);
    }
    
    .share-btn.whatsapp {
        background-color: #25D366;
    }
    
    .share-btn.facebook {
        background-color: #3b5998;
    }
    
    .share-btn.twitter {
        background-color: #000000;
    }
    
    .share-btn.linkedin {
        background-color: #0077b5;
    }
    
    .share-btn.copy-link {
        background-color: #6c757d;
    }
    
    .error-message {
        text-align: center;
        padding: 50px 20px;
    }
    
    @media (max-width: 768px) {
        .article-meta {
            flex-direction: column;
            gap: 10px;
        }
        
        .social-share {
            justify-content: center;
        }
        
        .article-body {
            font-size: 1rem;
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
