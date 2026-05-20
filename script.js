document.addEventListener('DOMContentLoaded', () => {
    // Dropdown logic
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const menu = toggle.nextElementSibling;
            menu.classList.toggle('show');
            toggle.classList.toggle('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(d => {
                d.classList.remove('show');
            });
            document.querySelectorAll('.dropdown-toggle').forEach(t => {
                t.classList.remove('active');
            });
        }
        
        // Close hamburger menu when clicking outside
        if (!e.target.closest('.nav-links') && !e.target.closest('.hamburger')) {
            const navLinks = document.getElementById('nav-links');
            const hamburger = document.getElementById('hamburger');
            if (navLinks && hamburger) {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
            }
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
        // Extract filename and parameters from URL using robust parsing
        const parsedUrl = new URL(url, window.location.origin);
        let path = parsedUrl.pathname;
        let searchParams = parsedUrl.search.substring(1);

        // Remove trailing slash if it exists and path isn't just root
        if (path.endsWith('/') && path.length > 1) {
            path = path.slice(0, -1);
        }

        let filename = path.split('/').pop() || 'home.html';

        // Handle root or index.html routing
        if (filename === 'index.html' || filename === '') {
            filename = 'home.html';
        }

        // Auto-append .html for extensionless URLs
        if (!filename.includes('.')) {
            filename = filename + '.html';
        }

        try {
            console.log('Loading content for:', filename);
            // Fetch fragments from the pages/ directory (absolute)
            const response = await fetch(`/pages/${filename}`);
            if (!response.ok) {
                console.error('Fetch failed for:', filename, response.status);
                throw new Error('Page not found');
            }
            const html = await response.text();

            // Inject and scroll to top
            app.innerHTML = html;
            window.scrollTo(0, 0);

            // Update title dynamically from loaded fragment's h1
            if (filename === 'home.html') {
                document.title = 'JL UNI MULTISERV INC. | Home';
            } else {
                const pageTitleEl = app.querySelector('h1');
                if (pageTitleEl) {
                    const titleText = pageTitleEl.textContent.trim();
                    document.title = `JL UNI MULTISERV INC. | ${titleText}`;
                } else {
                    document.title = 'JL UNI MULTISERV INC.';
                }
            }

            updateActiveLinks(filename);

            // Check if page contains schedule-item-wrapper
            const scheduleWrapper = app.querySelector('.schedule-item-wrapper');
            if (scheduleWrapper) {
                const courseKey = scheduleWrapper.getAttribute('data-course-key');
                if (courseKey) {
                    loadSchedules(courseKey, scheduleWrapper);
                }
            }

            // Initialize page specific logic
            if (filename === 'events.html') {
                loadEventsPage();
            } else if (filename === 'event-detail.html') {
                const params = new URLSearchParams(searchParams);
                const slug = params.get('slug');
                loadEventDetail(slug);
            } else if (filename === 'admin.html') {
                initAdminCMS();
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
                const navLinks = document.getElementById('nav-links');
                const hamburger = document.getElementById('hamburger');
                if (navLinks && hamburger) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                }
                
                history.pushState(null, '', href); // Update URL bar
                loadContent(href); // Load the fragment
            }
        }
    });

    // Handle back button
    window.addEventListener('popstate', () => {
        loadContent(window.location.pathname + window.location.search);
    });

    // Initial load
    loadContent(window.location.pathname + window.location.search);
});

// --- Dynamic Content Layer Helpers ---

// Environment Variable password configuration
const ADMIN_PASSWORD = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_ADMIN_PASSWORD
    : 'JLUMADMIN12345';

// GitHub Repository Configuration
const GITHUB_OWNER = 'cndrz';
const GITHUB_REPO = 'JLUM';
const CONTENT_FILE_PATH = 'public/data/content.json';

// Shared local content memory model
let localContentData = null;

// Fetch the single source of truth content JSON
async function fetchContentJSON() {
    try {
        const response = await fetch('/data/content.json?t=' + Date.now());
        if (!response.ok) throw new Error('Failed to fetch content database');
        return await response.json();
    } catch (err) {
        console.error('Error fetching content.json:', err);
        return null;
    }
}

// Format newline paragraphs into dynamic HTML
function formatBody(text) {
    if (!text) return '';
    return text.split('\n\n').map(para => {
        para = para.trim();
        if (para.startsWith('### ')) {
            return `<h3>${para.replace('### ', '')}</h3>`;
        }
        if (para.startsWith('- ') || para.startsWith('* ')) {
            const listItems = para.split('\n').map(li => {
                const cleanText = li.replace(/^[-*]\s+/, '');
                // Handle bold inside list item
                return `<li>${cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`;
            }).join('');
            return `<ul>${listItems}</ul>`;
        }
        // Handle bold within text
        let html = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return `<p>${html.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

// --- Dynamic Page Renderers ---

// 1. Events List Page Renderer
async function loadEventsPage() {
    const container = document.getElementById('events-container');
    if (!container) return;

    const data = await fetchContentJSON();
    if (!data || !data.events || data.events.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No updates available at the moment.</p>';
        return;
    }

    container.innerHTML = ''; // Clear loaders

    data.events.forEach(evt => {
        const card = document.createElement('article');
        card.className = 'card';
        
        const badgeClass = evt.badgeType === 'training' ? 'event-badge-training' : 'event-badge-news';
        
        card.innerHTML = `
            <div class="card-image" style="background-image: url('${evt.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800'}'); background-size: cover; background-position: center;">
            </div>
            <div class="card-content">
                <span class="event-badge ${badgeClass}">${evt.badge}</span>
                <h2 class="card-title">${evt.title}</h2>
                <p class="card-desc">${evt.summary}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div class="event-date">
                        <span>📅 ${evt.date}</span>
                    </div>
                    <a href="event-detail.html?slug=${evt.slug}" class="btn-text" style="color: var(--accent-blue); font-weight: 600; font-size: 0.95rem;">Read More →</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 2. Event Detail Page Renderer
async function loadEventDetail(slug) {
    if (!slug) {
        console.error('No slug parameter provided');
        return;
    }

    const data = await fetchContentJSON();
    if (!data || !data.events) return;

    const event = data.events.find(e => e.slug === slug);
    if (!event) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="container" style="padding: 4rem 0; text-align: center;">
                    <h2>Event Not Found</h2>
                    <p>The event you are looking for does not exist or has been removed.</p>
                    <a href="events.html" class="btn btn-primary" style="margin-top: 1.5rem;">Back to Events</a>
                </div>
            `;
        }
        return;
    }

    // Populate the template elements
    const titleEl = document.getElementById('event-detail-title');
    const badgeEl = document.getElementById('event-detail-badge');
    const dateEl = document.getElementById('event-detail-date');
    const imageEl = document.getElementById('event-detail-image');
    const bodyEl = document.getElementById('event-detail-body');
    const infoTypeEl = document.getElementById('event-info-type');
    const infoDateEl = document.getElementById('event-info-date');

    if (titleEl) titleEl.textContent = event.title;
    if (badgeEl) {
        badgeEl.textContent = event.badge;
        badgeEl.className = 'event-badge ' + (event.badgeType === 'training' ? 'event-badge-training' : 'event-badge-news');
    }
    if (dateEl) dateEl.innerHTML = `📅 ${event.date}`;
    if (imageEl) {
        imageEl.style.backgroundImage = `url('${event.image}')`;
    }
    if (bodyEl) {
        bodyEl.innerHTML = formatBody(event.body);
    }
    if (infoTypeEl) infoTypeEl.textContent = event.badge;
    if (infoDateEl) infoDateEl.textContent = event.date;

    // Dynamically update site title tab
    document.title = `JL UNI MULTISERV INC. | ${event.title}`;
}

// 3. Dynamic Course Schedules Renderer
async function loadSchedules(courseKey, container) {
    if (!container || !courseKey) return;

    const data = await fetchContentJSON();
    if (!data || !data.schedules) return;

    const schedulesList = data.schedules[courseKey];
    if (!schedulesList || schedulesList.length === 0) {
        container.innerHTML = `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); background: #f8fafc; border-radius: 8px;">
                <p>No upcoming schedules announced yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = ''; // Clear default TBD text

    schedulesList.forEach(sched => {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        item.innerHTML = `
            <div class="schedule-item-title">${sched.batch}</div>
            <div class="schedule-item-dates">
                <p>${sched.dates}</p>
            </div>
        `;
        container.appendChild(item);
    });
}

// --- CMS Admin Control Panel Logic ---

async function initAdminCMS() {
    const loginGate = document.getElementById('admin-login-gate');
    const dashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error-msg');
    
    const githubPatModal = document.getElementById('github-pat-modal');
    const githubPatForm = document.getElementById('github-pat-form');
    
    if (!loginGate || !dashboard) return;

    // Check if user is already authenticated this session
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
        loginGate.style.display = 'none';
        checkGithubPATSetup();
    }

    // Login Submission Handler
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = document.getElementById('login-password').value;
        
        if (pwd === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_authenticated', 'true');
            loginGate.style.display = 'none';
            loginError.style.display = 'none';
            checkGithubPATSetup();
        } else {
            loginError.style.display = 'block';
        }
    });

    // Check PAT setup in localStorage
    function checkGithubPATSetup() {
        const pat = localStorage.getItem('github_pat');
        if (!pat) {
            githubPatModal.classList.add('show');
        } else {
            initializeDashboard();
        }
    }

    // PAT Form Submit
    githubPatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pat = document.getElementById('pat-input').value.trim();
        if (pat) {
            localStorage.setItem('github_pat', pat);
            githubPatModal.classList.remove('show');
            initializeDashboard();
        }
    });

    // Reset PAT Action
    document.getElementById('btn-reset-pat').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('github_pat');
        githubPatModal.classList.add('show');
    });
}

// Initialize workspace contents
async function initializeDashboard() {
    const dashboard = document.getElementById('admin-dashboard');
    dashboard.style.display = 'grid';

    // Fetch master database
    localContentData = await fetchContentJSON();
    if (!localContentData) {
        alert('CRITICAL ERROR: Failed to load database file. Please ensure content.json exists.');
        return;
    }

    // Render Dashboard Tables
    renderAdminEvents();
    renderAdminSchedules();
    setupDashboardTabs();
    setupDashboardCRUD();
}

// Tab Switching Routing
function setupDashboardTabs() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            document.getElementById(`tab-content-${tabId}`).style.display = 'block';
        });
    });
}

// News & Events Feed Rendering
function renderAdminEvents() {
    const tbody = document.getElementById('admin-events-list');
    const totalCount = document.getElementById('stat-total-events');
    if (!tbody || !localContentData) return;

    tbody.innerHTML = '';
    totalCount.textContent = localContentData.events.length;

    localContentData.events.forEach((evt) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="width: 50px; height: 50px; border-radius: 6px; background-image: url('${evt.image}'); background-size: cover; background-position: center; border: 1px solid var(--border-color);"></div>
            </td>
            <td>
                <strong style="color: var(--text-primary); font-size: 0.95rem;">${evt.title}</strong><br>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">/event-detail.html?slug=${evt.slug}</span>
            </td>
            <td>
                <span class="event-badge ${evt.badgeType === 'training' ? 'event-badge-training' : 'event-badge-news'}" style="margin: 0;">${evt.badge}</span>
            </td>
            <td>${evt.date}</td>
            <td style="text-align: center;">
                <button class="admin-action-btn admin-btn-edit" data-id="${evt.id}" title="Edit Article">✏️</button>
                <button class="admin-action-btn admin-btn-delete" data-id="${evt.id}" title="Delete Article">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Schedules Workspace Rendering
function renderAdminSchedules() {
    const tbody = document.getElementById('admin-schedules-list');
    const selector = document.getElementById('admin-course-selector');
    if (!tbody || !selector || !localContentData) return;

    const courseKey = selector.value;
    const batchList = localContentData.schedules[courseKey] || [];

    tbody.innerHTML = '';

    if (batchList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No schedules announced for this course. Click Add Batch to create one.</td>
            </tr>
        `;
        return;
    }

    batchList.forEach((sched, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${sched.batch}</strong></td>
            <td>${sched.dates}</td>
            <td style="text-align: center;">
                <button class="admin-action-btn admin-btn-edit" data-index="${index}" title="Edit Batch">✏️</button>
                <button class="admin-action-btn admin-btn-delete" data-index="${index}" title="Delete Batch">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Set up event listeners for CRUD buttons
function setupDashboardCRUD() {
    // Selector change updates schedule table
    const selector = document.getElementById('admin-course-selector');
    selector.addEventListener('change', renderAdminSchedules);

    // Modal elements
    const eventModal = document.getElementById('event-form-modal');
    const scheduleModal = document.getElementById('schedule-form-modal');

    // NEWS EVENTS CRUD ACTIONS
    document.getElementById('btn-add-event').addEventListener('click', () => {
        document.getElementById('event-editor-form').reset();
        document.getElementById('event-form-id').value = '';
        document.getElementById('event-modal-title').textContent = 'New Article';
        eventModal.classList.add('show');
    });

    document.getElementById('btn-close-event-modal').addEventListener('click', () => eventModal.classList.remove('show'));
    document.getElementById('btn-cancel-event').addEventListener('click', () => eventModal.classList.remove('show'));

    document.getElementById('admin-events-list').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (!id) return;

        if (e.target.classList.contains('admin-btn-edit')) {
            const evt = localContentData.events.find(x => x.id === id);
            if (evt) {
                document.getElementById('event-form-id').value = evt.id;
                document.getElementById('event-form-title').value = evt.title;
                document.getElementById('event-form-badge').value = evt.badge;
                document.getElementById('event-form-badge-type').value = evt.badgeType;
                document.getElementById('event-form-date').value = evt.date;
                document.getElementById('event-form-slug').value = evt.slug;
                document.getElementById('event-form-image').value = evt.image;
                document.getElementById('event-form-summary').value = evt.summary;
                document.getElementById('event-form-body').value = evt.body;

                document.getElementById('event-modal-title').textContent = 'Edit Article';
                eventModal.classList.add('show');
            }
        } else if (e.target.classList.contains('admin-btn-delete')) {
            if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                localContentData.events = localContentData.events.filter(x => x.id !== id);
                renderAdminEvents();
                markUnsavedChanges();
            }
        }
    });

    document.getElementById('event-editor-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('event-form-id').value;
        const title = document.getElementById('event-form-title').value.trim();
        const badge = document.getElementById('event-form-badge').value.trim();
        const badgeType = document.getElementById('event-form-badge-type').value;
        const date = document.getElementById('event-form-date').value.trim();
        const slug = document.getElementById('event-form-slug').value.trim();
        const image = document.getElementById('event-form-image').value.trim();
        const summary = document.getElementById('event-form-summary').value.trim();
        const body = document.getElementById('event-form-body').value.trim();

        if (id) {
            // Edit existing
            const index = localContentData.events.findIndex(x => x.id === id);
            if (index !== -1) {
                localContentData.events[index] = { id, title, badge, badgeType, date, slug, image, summary, body };
            }
        } else {
            // Add new
            const newId = 'evt-' + Date.now().toString(36);
            localContentData.events.unshift({ id: newId, title, badge, badgeType, date, slug, image, summary, body });
        }

        eventModal.classList.remove('show');
        renderAdminEvents();
        markUnsavedChanges();
    });

    // SCHEDULES CRUD ACTIONS
    document.getElementById('btn-add-schedule').addEventListener('click', () => {
        document.getElementById('schedule-editor-form').reset();
        document.getElementById('schedule-form-index').value = '';
        document.getElementById('schedule-modal-title').textContent = 'Add Batch';
        scheduleModal.classList.add('show');
    });

    document.getElementById('btn-close-schedule-modal').addEventListener('click', () => scheduleModal.classList.remove('show'));
    document.getElementById('btn-cancel-schedule').addEventListener('click', () => scheduleModal.classList.remove('show'));

    document.getElementById('admin-schedules-list').addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        if (index === null || index === undefined) return;

        const idx = parseInt(index);
        const courseKey = selector.value;
        const batchList = localContentData.schedules[courseKey] || [];

        if (e.target.classList.contains('admin-btn-edit')) {
            const sched = batchList[idx];
            if (sched) {
                document.getElementById('schedule-form-index').value = idx;
                document.getElementById('schedule-form-batch').value = sched.batch;
                document.getElementById('schedule-form-dates').value = sched.dates;
                
                document.getElementById('schedule-modal-title').textContent = 'Edit Batch';
                scheduleModal.classList.add('show');
            }
        } else if (e.target.classList.contains('admin-btn-delete')) {
            if (confirm(`Remove "${batchList[idx].batch}"?`)) {
                batchList.splice(idx, 1);
                localContentData.schedules[courseKey] = batchList;
                renderAdminSchedules();
                markUnsavedChanges();
            }
        }
    });

    document.getElementById('schedule-editor-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const index = document.getElementById('schedule-form-index').value;
        const batch = document.getElementById('schedule-form-batch').value.trim();
        const dates = document.getElementById('schedule-form-dates').value.trim();
        
        const courseKey = selector.value;
        if (!localContentData.schedules[courseKey]) {
            localContentData.schedules[courseKey] = [];
        }

        if (index !== '') {
            // Edit existing
            const idx = parseInt(index);
            localContentData.schedules[courseKey][idx] = { batch, dates };
        } else {
            // Add new
            localContentData.schedules[courseKey].push({ batch, dates });
        }

        scheduleModal.classList.remove('show');
        renderAdminSchedules();
        markUnsavedChanges();
    });

    // PUBLISH PIPELINE SAVE FUNCTION
    document.getElementById('btn-publish-all').addEventListener('click', publishChangesToGitHub);
}

function markUnsavedChanges() {
    const indicator = document.getElementById('publish-status');
    indicator.textContent = '⚠️ Unsaved changes locally. Please publish!';
    indicator.className = 'publish-status-indicator error';
}

// GitHub REST API Commit Pipeline
async function publishChangesToGitHub() {
    const pat = localStorage.getItem('github_pat');
    const indicator = document.getElementById('publish-status');
    const btn = document.getElementById('btn-publish-all');

    if (!pat) {
        alert('GitHub API Personal Access Token is missing. Click Update GitHub Token below to fix.');
        return;
    }

    try {
        // Step 1: Update UI to saving
        btn.disabled = true;
        indicator.textContent = '🔄 Accessing Repository...';
        indicator.className = 'publish-status-indicator saving';

        // Step 2: Fetch current content.json SHA
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_FILE_PATH}`;
        
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });

        let sha = '';
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        } else if (getResponse.status !== 404) {
            throw new Error(`GitHub API request failed with status: ${getResponse.status}`);
        }

        // Step 3: Put/Commit updated database
        indicator.textContent = '🔄 Committing Content Database...';
        
        // Safely stringify local content memory
        const jsonContentStr = JSON.stringify(localContentData, null, 2);
        
        // Base64 encode handling unicode characters perfectly
        const base64Content = btoa(unescape(encodeURIComponent(jsonContentStr)));

        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update dynamic content database via Admin CMS Portal',
                content: base64Content,
                sha: sha
            })
        });

        if (!putResponse.ok) {
            const errData = await putResponse.json();
            throw new Error(errData.message || 'Failed to commit changes');
        }

        // Step 4: Output Rebuilding Status
        indicator.textContent = '✅ Published! Vercel Rebuilding (~30-60s)...';
        indicator.className = 'publish-status-indicator success';
        
        const timestamp = new Date().toLocaleTimeString();
        document.getElementById('stat-last-saved').textContent = timestamp;

        setTimeout(() => {
            indicator.textContent = 'All changes saved locally.';
            indicator.className = 'publish-status-indicator';
        }, 5000);

    } catch (error) {
        console.error('Error publishing to GitHub:', error);
        alert(`Failed to publish changes: ${error.message}`);
        indicator.textContent = '❌ Failed to publish live.';
        indicator.className = 'publish-status-indicator error';
    } finally {
        btn.disabled = false;
    }
}
