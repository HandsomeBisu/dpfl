import { addDoc, collection } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { auth, db, storage } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

export function initTeamRegisterPage() {
    const teamRegisterForm = document.getElementById('team-register-form');
    if(!teamRegisterForm) return;

    teamRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teamName = teamRegisterForm['team-name'].value;
        const teamDesc = teamRegisterForm['team-description'].value;
        const iconFile = teamRegisterForm['team-icon'].files[0];

        let downloadURL = null;

        try {
            if (iconFile) {
                const storageRef = ref(storage, `team-icons/${Date.now()}_${iconFile.name}`);
                await uploadBytes(storageRef, iconFile);
                downloadURL = await getDownloadURL(storageRef);
            }
            
            await addDoc(collection(db, "pendingTeams"), {
                name: teamName,
                description: teamDesc,
                iconUrl: downloadURL,
                leader: auth.currentUser.uid,
                requestedAt: new Date()
            });
            window.location.href = 'request-submitted.html';
        } catch (error) {
            console.error("Team registration error:", error);
            showCustomAlert('오류가 발생했습니다. 다시 시도해주세요.');
        }
    });
}