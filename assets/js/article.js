document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyDASxEfx3bAlOCt-2qqhnb10EucniGS6Tk",
            authDomain: "vastavikta-article-db.firebaseapp.com",
            projectId: "vastavikta-article-db",
            storageBucket: "vastavikta-article-db.appspot.com",
            messagingSenderId: "792686025515",
            appId: "1:792686025515:web:acb55f64fb21472153836e"
        });
    }

    const db = firebase.firestore();
    const articleContent = document.getElementById('article-content');
    
    try {
        const articleDoc = await db.collection('articles').doc(articleId).get();
        
        if (!articleDoc.exists) {
            throw new Error('Article not found');
        }
        
        const article = articleDoc.data();
        
        // Process image URL - matches the script.js logic
        let imageHtml = '';
        if (article.imageUrl) {
            let imageUrl = article.imageUrl;
            
            // Convert Google Drive URL to embeddable format
            if (imageUrl.includes('drive.google.com')) {
                const fileId = imageUrl.match(/[\/=]([a-zA-Z0-9_-]{25,})/)?.[1];
                if (fileId) {
                    imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
                }
            }
            
            imageHtml = `
                <div class="article-image-container">
                    <img src="${imageUrl}" 
                         alt="${article.title}"
                         onerror="this.onerror=null;this.src='assets/images/placeholder.jpg'"
                         class="featured-article-image">
                </div>
            `;
        }
        
        // Display article
        articleContent.innerHTML = `
            <div class="article-header">
                <h1 class="article-title">${article.title}</h1>
                ${imageHtml}
                
            </div>
            <div class="article-body">
                ${article.content || 'No content available'}
            <span class="article-category">${article.category || 'General'}</span>
            </div>
        `;
        
        // Update view count
        try {
            await db.collection('articles').doc(articleId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });
        } catch (updateError) {
            console.log("View count update failed:", updateError);
        }
        
    } catch (error) {
        console.error('Error loading article:', error);
        articleContent.innerHTML = `
            <div class="error-message">
                <h2>Error Loading Article</h2>
                <p>${error.message}</p>
                <a href="index.html" class="btn btn-primary">Return to Homepage</a>
            </div>
        `;
    }
});