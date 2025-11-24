
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle'); // Changed ID to match new HTML
    const body = document.body;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    } else {
        // Set default theme if none saved (e.g., from system preference or default dark)
        body.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'light') {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Promo Banner Visibility Logic
    const promoBanner = document.getElementById('promoBanner');
    if (promoBanner) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 0) {
                promoBanner.classList.add('promo-banner-hidden');
            } else {
                promoBanner.classList.remove('promo-banner-hidden');
            }
        });
    }
});
