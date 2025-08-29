import { listenAuthState } from './auth/authState.js';
import { handleSignup, handleLogin } from './auth/auth.js';

function getPageName() {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    return page;
}

function setupMobileNav() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        navLinks.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                navLinks.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Listen for authentication state changes to handle routing and nav updates
    listenAuthState();

    // Setup mobile navigation
    setupMobileNav();

    // Attach event listeners for login and signup forms if they exist on the page
    handleLogin();
    handleSignup();
});

// Disable right-click
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) || (e.ctrlKey && e.shiftKey && (e.keyCode === 73)) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) || (e.ctrlKey && e.shiftKey && (e.keyCode === 74)) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) || (e.ctrlKey && e.shiftKey && (e.keyCode === 67)) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) || (e.ctrlKey && (e.keyCode === 85))) {
        e.preventDefault();
    }
});
