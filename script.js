document.addEventListener('DOMContentLoaded', () => {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            // Check if we are in mobile view (screen width <= 768px)
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const parent = toggle.parentElement;
                parent.classList.toggle('active');
            }
        });
    });

    // Close menu when clicking outside (optional but good for UX)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown').forEach(d => {
                d.classList.remove('active');
            });
        }
    });
});
