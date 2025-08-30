import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

document.addEventListener('DOMContentLoaded', async () => {
    const popupForm = document.getElementById('popup-form');
    if (!popupForm) return;

    // Load existing popup data
    try {
        const popupRef = doc(db, 'popups', 'mainPopup');
        const popupSnap = await getDoc(popupRef);

        if (popupSnap.exists()) {
            const popupData = popupSnap.data();
            document.getElementById('popup-content').value = popupData.content || '';
            document.getElementById('popup-start-date').value = popupData.startDate || '';
            document.getElementById('popup-end-date').value = popupData.endDate || '';
        }
    } catch (error) {
        console.error("Error loading popup data:", error);
        showCustomAlert('팝업 정보를 불러오는 중 오류가 발생했습니다.');
    }

    popupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = popupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '저장 중...';

        const content = document.getElementById('popup-content').value;
        const startDate = document.getElementById('popup-start-date').value;
        const endDate = document.getElementById('popup-end-date').value;

        if (!content || !startDate || !endDate) {
            showCustomAlert('모든 필드를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '저장';
            return;
        }

        try {
            const popupRef = doc(db, 'popups', 'mainPopup');
            await setDoc(popupRef, {
                content,
                startDate,
                endDate,
                updatedAt: new Date()
            });
            showCustomAlert('팝업이 성공적으로 저장되었습니다.');
        } catch (error) {
            console.error("Error saving popup data:", error);
            showCustomAlert('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '저장';
        }
    });

    const deleteButton = document.getElementById('delete-popup-btn');
    deleteButton.addEventListener('click', async () => {
        if (confirm('정말로 팝업을 삭제하시겠습니까?')) {
            const submitButton = document.querySelector('#popup-form button[type="submit"]');
            submitButton.disabled = true;
            deleteButton.disabled = true;

            try {
                const popupRef = doc(db, 'popups', 'mainPopup');
                await deleteDoc(popupRef);
                
                // Clear the form
                document.getElementById('popup-content').value = '';
                document.getElementById('popup-start-date').value = '';
                document.getElementById('popup-end-date').value = '';

                showCustomAlert('팝업이 성공적으로 삭제되었습니다.');
            } catch (error) {
                console.error("Error deleting popup data:", error);
                showCustomAlert('오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                submitButton.disabled = false;
                deleteButton.disabled = false;
            }
        }
    });
});
