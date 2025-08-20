import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { auth, db, storage } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

function disablePlayerRegistrationForm(message, buttonText, buttonLink) {
    const formBox = document.querySelector('.form-box');
    const form = document.getElementById('player-register-form');
    const existingP = formBox?.querySelector('p');

    if (formBox && form) {
        if (existingP) existingP.style.display = 'none';
        form.style.display = 'none';

        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.cssText = 'color: #555; text-align: center; padding: 1rem 0; line-height: 1.6;';

        const h1 = formBox.querySelector('h1');
        if (h1) h1.insertAdjacentElement('afterend', messageElement);
        
        const button = document.createElement('a');
        button.href = buttonLink;
        button.className = 'btn';
        button.textContent = buttonText;
        button.style.cssText = 'margin-top: 1rem; display: inline-block; text-decoration: none;';
        formBox.appendChild(button);
    }
}

async function checkExistingPlayer() {
    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;
    const playerQuery = query(collection(db, "players"), where("uid", "==", uid));
    const pendingPlayerQuery = query(collection(db, "pendingPlayers"), where("submitterUid", "==", uid));

    const [playerSnapshot, pendingPlayerSnapshot] = await Promise.all([
        getDocs(playerQuery),
        getDocs(pendingPlayerQuery)
    ]);

    if (!playerSnapshot.empty) {
        disablePlayerRegistrationForm("이미 등록된 선수 정보가 있습니다.", "마이페이지로 이동", "mypage.html");
    } else if (!pendingPlayerSnapshot.empty) {
        disablePlayerRegistrationForm("이미 선수 등록을 요청하셨습니다. 관리자 승인을 기다려주세요.", "메인으로 돌아가기", "index.html");
    }
}

function handlePlayerRegistrationForm() {
    const playerRegisterForm = document.getElementById('player-register-form');
    if (!playerRegisterForm) return;

    playerRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = playerRegisterForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '요청 중...';

        try {
            const user = auth.currentUser;
            if (!user) {
                showCustomAlert('로그인이 필요합니다.');
                window.location.href = 'login.html';
                return;
            }

            const playerName = document.getElementById('player-name').value;
            const playerProfile = document.getElementById('player-profile').value;
            const photoFile = document.getElementById('player-photo').files[0];
            let photoURL = null;

            if (photoFile) {
                const storageRef = ref(storage, `player-photos/${Date.now()}_${photoFile.name}`);
                await uploadBytes(storageRef, photoFile);
                photoURL = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, "pendingPlayers"), {
                name: playerName,
                profile: playerProfile,
                photoURL: photoURL,
                submitterUid: user.uid,
                requestedAt: new Date()
            });
            window.location.href = 'request-submitted.html';

        } catch (error) {
            console.error("Player registration error:", error);
            showCustomAlert('오류가 발생했습니다. 다시 시도해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '등록 요청';
        }
    });
}

export function initPlayerRegisterPage() {
    checkExistingPlayer();
    handlePlayerRegistrationForm();
}
