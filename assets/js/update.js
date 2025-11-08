// DOM Elements
const authContainer = document.getElementById('auth-container');
const updatePanel = document.getElementById('update-panel');
const articleSelect = document.getElementById('article-select');
const articlePreview = document.getElementById('article-preview');
const updateForm = document.getElementById('update-form');
const updateBtn = document.getElementById('update-article');
const deleteBtn = document.getElementById('delete-article');
const cancelBtn = document.getElementById('cancel-update');
const statusMessage = document.getElementById('update-status');
const recentArticlesGrid = document.getElementById('recent-articles-grid');

// Initialize Quill editor for update
const updateQuill = new Quill('#update-editor', {
    theme: 'snow',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'header': [1, 2, 3, false] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ]
    },
    placeholder: 'Edit your article content here...'
});

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Current selected article
let currentArticle = null;

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("User logged in:", user.email);
        authContainer.style.display = 'none';
        updatePanel.style.display = 'block';
        document.getElementById('auth-status').style.display = 'block';
        loadArticles();
        loadRecentArticles();
    } else {
        console.log("No user logged in");
        authContainer.style.display = 'flex';
        updatePanel.style.display = 'none';
        document.getElementById('auth-status').style.display = 'none';
    }
});

// Login handler
document.getElementById('login-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginStatus = document.getElementById('login-status');

    loginStatus.textContent = 'Logging in...';
    loginStatus.style.color = 'blue';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginStatus.textContent = 'Login successful!';
        loginStatus.style.color = 'green';
    } catch (error) {
        console.error("Login error:", error);
        loginStatus.textContent = `Login failed: ${error.message}`;
        loginStatus.style.color = 'red';
    }
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            console.log("User logged out");
            statusMessage.textContent = 'Logged out successfully';
            statusMessage.style.color = 'green';
        })
        .catch(error => {
            console.error("Logout error:", error);
            statusMessage.textContent = `Logout failed: ${error.message}`;
            statusMessage.style.color = 'red';
        });
});

// Load recent articles (6 most recent)
async function loadRecentArticles() {
    try {
        const snapshot = await db.collection('articles')
            .orderBy('createdAt', 'desc')
            .limit(6)
            .get();

        recentArticlesGrid.innerHTML = '';
        
        if (snapshot.empty) {
            recentArticlesGrid.innerHTML = '<p class="no-articles">No articles found</p>';
            return;
        }

        snapshot.forEach(doc => {
            const article = { id: doc.id, ...doc.data() };
            const articleCard = createRecentArticleCard(article);
            recentArticlesGrid.appendChild(articleCard);
        });

    } catch (error) {
        console.error("Error loading recent articles:", error);
        recentArticlesGrid.innerHTML = '<p class="error-message">Error loading articles</p>';
    }
}

// Create recent article card
function createRecentArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'recent-article-card';
    card.setAttribute('data-article-id', article.id);
    
    const imageUrl = article.imageUrl || 'assets/images/placeholder.jpg';
    const excerpt = article.excerpt || 'No excerpt available';
    const date = formatDate(article.createdAt);
    const views = article.views || 0;
    
    card.innerHTML = `
        <div class="recent-article-image">
            <img src="${imageUrl}" alt="${article.title}" onerror="this.src='assets/images/placeholder.jpg'">
            <div class="recent-article-overlay">
                <button class="edit-recent-btn" data-article-id="${article.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
        <div class="recent-article-content">
            <span class="recent-article-category">${article.category}</span>
            <h4 class="recent-article-title">${article.title}</h4>
            <p class="recent-article-excerpt">${excerpt}</p>
            <div class="recent-article-meta">
                <span><i class="far fa-calendar"></i> ${date}</span>
                <span><i class="far fa-eye"></i> ${views}</span>
            </div>
        </div>
    `;
    
    // Add click event to edit button
    const editBtn = card.querySelector('.edit-recent-btn');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectArticleForEdit(article.id);
    });
    
    // Add click event to entire card
    card.addEventListener('click', () => {
        selectArticleForEdit(article.id);
    });
    
    return card;
}

// Select article for editing from recent articles
async function selectArticleForEdit(articleId) {
    try {
        statusMessage.textContent = 'Loading article...';
        statusMessage.style.color = 'blue';

        const doc = await db.collection('articles').doc(articleId).get();
        
        if (!doc.exists) {
            statusMessage.textContent = 'Article not found';
            statusMessage.style.color = 'red';
            return;
        }

        currentArticle = { id: doc.id, ...doc.data() };
        
        // Update dropdown selection
        articleSelect.value = articleId;
        
        // Display preview and form
        displayArticlePreview(currentArticle);
        populateUpdateForm(currentArticle);

        articlePreview.style.display = 'block';
        updateForm.style.display = 'block';

        // Scroll to form
        updateForm.scrollIntoView({ behavior: 'smooth' });

        statusMessage.textContent = 'Article loaded successfully';
        statusMessage.style.color = 'green';

    } catch (error) {
        console.error("Error loading article:", error);
        statusMessage.textContent = `Error loading article: ${error.message}`;
        statusMessage.style.color = 'red';
    }
}

// Load all articles for dropdown
async function loadArticles() {
    try {
        statusMessage.textContent = 'Loading articles...';
        statusMessage.style.color = 'blue';

        const snapshot = await db.collection('articles')
            .orderBy('createdAt', 'desc')
            .get();

        articleSelect.innerHTML = '<option value="">Select an article to update...</option>';
        
        if (snapshot.empty) {
            articleSelect.innerHTML = '<option value="">No articles found</option>';
            statusMessage.textContent = 'No articles found';
            statusMessage.style.color = 'orange';
            return;
        }

        snapshot.forEach(doc => {
            const article = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${article.title} (${formatDate(article.createdAt)})`;
            articleSelect.appendChild(option);
        });

        statusMessage.textContent = `Loaded ${snapshot.size} articles`;
        statusMessage.style.color = 'green';

    } catch (error) {
        console.error("Error loading articles:", error);
        statusMessage.textContent = `Error loading articles: ${error.message}`;
        statusMessage.style.color = 'red';
    }
}

// Article selection handler (for dropdown)
articleSelect.addEventListener('change', async (e) => {
    const articleId = e.target.value;
    
    if (!articleId) {
        articlePreview.style.display = 'none';
        updateForm.style.display = 'none';
        currentArticle = null;
        return;
    }

    await selectArticleForEdit(articleId);
});

// Display article preview
function displayArticlePreview(article) {
    document.getElementById('preview-title').textContent = article.title;
    document.getElementById('preview-excerpt').textContent = article.excerpt || 'No excerpt available';
    document.getElementById('preview-category').textContent = article.category;
    document.getElementById('preview-date').textContent = formatDate(article.createdAt);
    document.getElementById('preview-views').textContent = `${article.views || 0} views`;
    
    const previewImg = document.getElementById('preview-img');
    if (article.imageUrl) {
        previewImg.src = article.imageUrl;
        previewImg.style.display = 'block';
    } else {
        previewImg.style.display = 'none';
    }
}

// Populate update form with article data
function populateUpdateForm(article) {
    document.getElementById('update-title').value = article.title;
    document.getElementById('update-category').value = article.category;
    document.getElementById('update-image').value = '';
    updateQuill.root.innerHTML = article.content || '';
}

// Update article handler
updateBtn.addEventListener('click', async () => {
    if (!currentArticle) {
        statusMessage.textContent = 'Please select an article first';
        statusMessage.style.color = 'red';
        return;
    }

    const title = document.getElementById('update-title').value.trim();
    const category = document.getElementById('update-category').value;
    const rawImageUrl = document.getElementById('update-image').value.trim();
    const content = updateQuill.root.innerHTML;

    if (!title || !content) {
        statusMessage.textContent = 'Title and content are required';
        statusMessage.style.color = 'red';
        return;
    }

    statusMessage.textContent = 'Updating article...';
    statusMessage.style.color = 'blue';

    try {
        // Process Google Drive URL if provided
        let imageUrl = currentArticle.imageUrl;
        if (rawImageUrl) {
            if (rawImageUrl.includes('drive.google.com')) {
                const fileIdMatch = rawImageUrl.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
                if (fileIdMatch && fileIdMatch[1]) {
                    imageUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
                }
            } else {
                imageUrl = rawImageUrl;
            }
        }

        // Update article data
        const updateData = {
            title,
            category,
            imageUrl,
            content,
            excerpt: generateExcerpt(content),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log("Updating article:", updateData);

        // Update in Firestore
        await db.collection('articles').doc(currentArticle.id).update(updateData);
        
        console.log("Article updated successfully");
        statusMessage.textContent = 'Article updated successfully!';
        statusMessage.style.color = 'green';

        // Refresh the article list, recent articles, and preview
        setTimeout(() => {
            loadArticles();
            loadRecentArticles();
            displayArticlePreview({ ...currentArticle, ...updateData });
        }, 1000);

    } catch (error) {
        console.error('Update error:', error);
        statusMessage.textContent = `Update failed: ${error.message}`;
        statusMessage.style.color = 'red';
        
        if (error.code === 'permission-denied') {
            statusMessage.textContent += ' - Check Firestore rules';
        }
    }
});

// Delete article handler
deleteBtn.addEventListener('click', async () => {
    if (!currentArticle) {
        statusMessage.textContent = 'Please select an article first';
        statusMessage.style.color = 'red';
        return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete "${currentArticle.title}"? This action cannot be undone.`);
    
    if (!confirmDelete) {
        return;
    }

    statusMessage.textContent = 'Deleting article...';
    statusMessage.style.color = 'blue';

    try {
        await db.collection('articles').doc(currentArticle.id).delete();
        
        console.log("Article deleted successfully");
        statusMessage.textContent = 'Article deleted successfully!';
        statusMessage.style.color = 'green';

        // Clear form and refresh lists
        setTimeout(() => {
            articleSelect.value = '';
            articlePreview.style.display = 'none';
            updateForm.style.display = 'none';
            currentArticle = null;
            loadArticles();
            loadRecentArticles();
        }, 1000);

    } catch (error) {
        console.error('Delete error:', error);
        statusMessage.textContent = `Delete failed: ${error.message}`;
        statusMessage.style.color = 'red';
    }
});

// Cancel update handler
cancelBtn.addEventListener('click', () => {
    articleSelect.value = '';
    articlePreview.style.display = 'none';
    updateForm.style.display = 'none';
    currentArticle = null;
    statusMessage.textContent = '';
});

// Helper function to generate excerpt
function generateExcerpt(content, length = 150) {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.substring(0, length) + (plainText.length > length ? '...' : '');
}

// Helper function to format date
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize update panel
console.log("Update panel initialized");