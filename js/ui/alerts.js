const customAlertOverlay = document.getElementById('customAlert');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertConfirmBtn = document.getElementById('customAlertConfirm');
const customAlertCancelBtn = document.getElementById('customAlertCancel');

// This function is for simple alerts (OK only)
export function showCustomAlert(message) {
    if(!customAlertOverlay || !customAlertMessage || !customAlertConfirmBtn || !customAlertCancelBtn) {
        alert(message); // Fallback
        return;
    }
    
    customAlertMessage.textContent = message;
    customAlertCancelBtn.style.display = 'none';
    customAlertConfirmBtn.style.display = 'inline-block';
    
    customAlertOverlay.classList.add('active');

    const closeAlert = () => {
        customAlertOverlay.classList.remove('active');
        customAlertConfirmBtn.removeEventListener('click', closeAlert);
    };

    customAlertConfirmBtn.addEventListener('click', closeAlert);
}

// This function is for confirmations (OK/Cancel) and returns a Promise
export function showCustomConfirm(message) {
    return new Promise(resolve => {
        if(!customAlertOverlay || !customAlertMessage || !customAlertConfirmBtn || !customAlertCancelBtn) {
            resolve(window.confirm(message)); // Fallback
            return;
        }

        customAlertMessage.textContent = message;
        customAlertCancelBtn.style.display = 'inline-block';
        customAlertConfirmBtn.style.display = 'inline-block';

        customAlertOverlay.classList.add('active');

        const confirmHandler = () => {
            cleanup();
            resolve(true);
        };

        const cancelHandler = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            customAlertOverlay.classList.remove('active');
            customAlertConfirmBtn.removeEventListener('click', confirmHandler);
            customAlertCancelBtn.removeEventListener('click', cancelHandler);
        };

        customAlertConfirmBtn.addEventListener('click', confirmHandler);
        customAlertCancelBtn.addEventListener('click', cancelHandler);
    });
}