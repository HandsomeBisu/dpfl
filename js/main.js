import { listenAuthState } from './auth/authState.js';
import { handleSignup, handleLogin } from './auth/auth.js';

function getPageName() {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    return page;
}

async function loadPageModule() {
    const pageName = getPageName();

    switch (pageName) {
        case 'index.html':
        case '':
            const { initHomePage } = await import('./pages/home.js');
            await initHomePage();
            break;

        case 'player_detail.html':
            const { initPlayerDetailPage } = await import('./pages/playerDetail.js');
            await initPlayerDetailPage();
            break;

        case 'schedule.html':
            const { initSchedulePage } = await import('./pages/schedule.js');
            await initSchedulePage();
            break;
        
        // Add other pages here as needed
    }
}

function setupMobileNav() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
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
