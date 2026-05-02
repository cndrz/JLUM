document.addEventListener('DOMContentLoaded', () => {
    // Dropdown logic
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggle.nextElementSibling.classList.toggle('show');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(d => {
                d.classList.remove('show');
            });
        }
        
        // Close hamburger menu when clicking outside
        if (!e.target.closest('.nav-links') && !e.target.closest('.hamburger')) {
            document.getElementById('nav-links').classList.remove('active');
            document.getElementById('hamburger').classList.remove('active');
        }
    });

    // Hamburger Menu Logic
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // SPA Router Logic
    const app = document.getElementById('app');

    const loadContent = async (url) => {
        // Extract filename from URL, handle trailing slashes
        let filename = url.split('/').pop() || 'index.html';

        // Handle root or index
        if (filename === 'index.html' || filename === '') {
            filename = 'home.html';
        }

        try {
            // Fetch fragments from the pages/ directory (relative)
            const response = await fetch(`pages/${filename}`);
            if (!response.ok) throw new Error('Page not found');
            const html = await response.text();

            // Inject and scroll to top
            app.innerHTML = html;
            window.scrollTo(0, 0);

            updateActiveLinks(filename);

            // Initialize page specific logic
            if (filename === 'events.html') {
                initLiveNews();
            }
        } catch (error) {
            app.innerHTML = `
                <div class="container" style="padding: 4rem 0; text-align: center;">
                    <h2>404 - Page Not Found</h2>
                    <p>The page you are looking for could not be found: <strong>${filename}</strong></p>
                </div>
            `;
            console.error('Error loading page:', error);
        }
    };

    const updateActiveLinks = (filename) => {
        // Reset all active
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

        let targetHref = filename === 'home.html' ? 'index.html' : filename;
        const activeLink = document.querySelector(`.nav-links a[href="${targetHref}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    };

    // Intercept link clicks
    document.body.addEventListener('click', e => {
        const link = e.target.closest('a');
        if (link) {
            const href = link.getAttribute('href');
            // If it's a valid internal link and we aren't opening a new tab
            if (href && !href.startsWith('http') && !href.startsWith('#') && link.target !== '_blank') {
                e.preventDefault(); // Stop full reload
                
                // Close mobile menu
                document.getElementById('nav-links').classList.remove('active');
                document.getElementById('hamburger').classList.remove('active');
                
                history.pushState(null, '', href); // Update URL bar
                loadContent(href); // Load the fragment
            }
        }
    });

    // Handle back button
    window.addEventListener('popstate', () => {
        loadContent(window.location.pathname);
    });

    // Initial load
    loadContent(window.location.pathname);
});

// --- Live News Integration ---
// Safely handle environment variables
const THENEWS_API_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_THENEWS_API_TOKEN
    : '';

async function initLiveNews() {
    const container = document.getElementById('live-news-container');
    if (!container) return;

    try {
        // Focused on Philippines safety and industrial news
        const query = 'occupational safety health industrial news';
        const url = `https://api.thenewsapi.com/v1/news/top?api_token=${THENEWS_API_TOKEN}&search=${encodeURIComponent(query)}&limit=3&language=en`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch news');

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            renderNews(data.data, container);
        } else {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No live news available at the moment.</p>';
        }
    } catch (error) {
        console.error('Error fetching live news:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Unable to load live news. Please try again later.</p>';
    }
}

function renderNews(articles, container) {
    container.innerHTML = ''; // Clear skeletons

    articles.forEach(article => {
        const date = new Date(article.published_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-image" style="background-image: url('${article.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800'}'); background-size: cover; background-position: center;">
            </div>
            <div class="card-content">
                <div class="news-source-tag">${article.source || 'Industry News'}</div>
                <h2 class="card-title">${article.title}</h2>
                <p class="card-desc">${article.description || 'No description available.'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div class="event-date">
                        <span>📅 ${date}</span>
                    </div>
                    <a href="${article.url}" target="_blank" class="btn-text" style="color: var(--accent-blue); font-weight: 600; font-size: 0.9rem;">Read More →</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
