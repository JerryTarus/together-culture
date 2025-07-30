// Clear any local storage/session data
        localStorage.clear();
        sessionStorage.clear();

        // Show logout message and redirect to homepage
        showMessage('Logged out successfully. Redirecting...', 'success', 1500);
        setTimeout(() => {
            window.location.href = '/';
        }, 1600);