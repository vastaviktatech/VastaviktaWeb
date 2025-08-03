// DOM Elements
const loginForm = document.getElementById('auth-container');
const adminPanel = document.getElementById('admin-panel');
const publishBtn = document.getElementById('publish-article');
const statusMessage = document.getElementById('status-message');

// Initialize Quill editor
const quill = new Quill('#editor', {
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
  placeholder: 'Write your article here...'
});

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("User logged in:", user.email);
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('auth-status').style.display = 'block';
    } else {
        console.log("No user logged in");
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('auth-status').style.display = 'none';
    }
});

// Login handler
document.getElementById('login-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  statusMessage.textContent = 'Logging in...';
  statusMessage.style.color = 'blue';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    statusMessage.textContent = 'Login successful!';
    statusMessage.style.color = 'green';
  } catch (error) {
    console.error("Login error:", error);
    statusMessage.textContent = `Login failed: ${error.message}`;
    statusMessage.style.color = 'red';
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

// Publish handler
publishBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    statusMessage.textContent = 'Please log in first';
    statusMessage.style.color = 'red';
    return;
  }

  const title = document.getElementById('article-title').value.trim();
  const category = document.getElementById('article-category').value;
  const rawImageUrl = document.getElementById('article-image').value.trim();
  const content = quill.root.innerHTML;

  if (!title || !content) {
    statusMessage.textContent = 'Title and content are required';
    statusMessage.style.color = 'red';
    return;
  }

  statusMessage.textContent = 'Publishing article...';
  statusMessage.style.color = 'blue';

  try {
    // Process Google Drive URL
    let imageUrl = rawImageUrl;
    if (rawImageUrl.includes('drive.google.com')) {
      const fileIdMatch = rawImageUrl.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
      if (fileIdMatch && fileIdMatch[1]) {
        imageUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
      }
    }

    // Create article data
    const articleData = {
      title,
      category,
      imageUrl: imageUrl || '',
      content,
      excerpt: generateExcerpt(content),
      published: true, // Critical for articles to appear
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      views: 0,
      author: user.email,
      authorId: user.uid
    };

    console.log("Publishing article:", articleData);

    // Add to Firestore
    const docRef = await db.collection('articles').add(articleData);
    console.log("Article published with ID:", docRef.id);

    // Clear form
    document.getElementById('article-title').value = '';
    document.getElementById('article-image').value = '';
    quill.root.innerHTML = '';

    statusMessage.textContent = 'Article published successfully!';
    statusMessage.style.color = 'green';

    // Optional: Redirect to view the article
    // window.location.href = `article.html?id=${docRef.id}`;

  } catch (error) {
    console.error('Publish error:', error);
    statusMessage.textContent = `Publishing failed: ${error.message}`;
    statusMessage.style.color = 'red';
    
    // Detailed error handling
    if (error.code === 'permission-denied') {
      statusMessage.textContent += ' - Check Firestore rules';
    } else if (error.code === 'invalid-argument') {
      statusMessage.textContent += ' - Invalid data format';
    }
  }
});

// Helper function to generate excerpt
function generateExcerpt(content, length = 150) {
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, '');
  // Trim to specified length
  return plainText.substring(0, length) + (plainText.length > length ? '...' : '');
}

// Initialize admin panel
console.log("Admin panel initialized");