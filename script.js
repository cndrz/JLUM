document.addEventListener('DOMContentLoaded', () => {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            // Mobile toggle logic removed as per revert request
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
