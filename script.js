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
    });

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
            const response = await fetch(`/pages/${filename}`);
            if (!response.ok) throw new Error('Page not found');
            const html = await response.text();
            
            // Inject and scroll to top
            app.innerHTML = html;
            window.scrollTo(0, 0); 
            
            updateActiveLinks(filename);
        } catch (error) {
            app.innerHTML = `
                <div class="container" style="padding: 4rem 0; text-align: center;">
                    <h2>404 - Page Not Found</h2>
                    <p>The page you are looking for could not be found.</p>
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
