import { listenAuthState } from './auth/authState.js';
import { handleSignup, handleLogin } from './auth/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Listen for authentication state changes to handle routing and nav updates
    listenAuthState();

    // Attach event listeners for login and signup forms if they exist on the page
    handleLogin();
    handleSignup();
});
