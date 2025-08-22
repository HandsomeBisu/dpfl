import { addDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { auth, db } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";
import { uploadToCloudinary } from "../cloudinary/upload.js";

function disableTeamRegistrationForm(message, buttonText, buttonLink) {
    const formBox = document.querySelector('.form-box');
    const form = document.getElementById('team-register-form');
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

async function checkExistingTeamAffiliation(user) {
    if (!user) return;

    const uid = user.uid;
    const managedTeamsQuery = query(collection(db, "teams"), where("leader", "==", uid));
    const playerQuery = query(collection(db, "players"), where("uid", "==", uid));

    const [managedTeamsSnapshot, playerSnapshot] = await Promise.all([
        getDocs(managedTeamsQuery),
        getDocs(playerQuery)
    ]);

    if (!managedTeamsSnapshot.empty) {
        disableTeamRegistrationForm("이미 관리하는 팀이 있습니다. 팀은 하나만 생성할 수 있습니다.", "마이페이지로 이동", "mypage.html");
        return true; // Is affiliated
    }

    if (!playerSnapshot.empty) {
        const player = playerSnapshot.docs[0].data();
        if (player.teamId) {
            disableTeamRegistrationForm("이미 소속된 팀이 있습니다. 팀 생성은 소속이 없는 선수만 가능합니다.", "마이페이지로 이동", "mypage.html");
            return true; // Is affiliated
        }
    }
    
    return false; // Is not affiliated
}


function handleTeamRegistrationForm() {
    const teamRegisterForm = document.getElementById('team-register-form');
    if(!teamRegisterForm) return;

    teamRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = teamRegisterForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '요청 중...';

        const teamName = teamRegisterForm['team-name'].value;
        const teamDesc = teamRegisterForm['team-description'].value;
        const iconFile = teamRegisterForm['team-icon'].files[0];

        let downloadURL = null;

        try {
            if (iconFile) {
                downloadURL = await uploadToCloudinary(iconFile);
                if (!downloadURL) {
                    throw new Error('Cloudinary image upload failed.');
                }
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
            submitButton.disabled = false;
            submitButton.textContent = '등록 요청';
        }
    });
}

export async function initTeamRegisterPage(user) {
    if (!user) {
        // This case is handled by the router, but as a fallback:
        window.location.href = 'login.html';
        return;
    }
    const isAffiliated = await checkExistingTeamAffiliation(user);
    if (!isAffiliated) {
        handleTeamRegistrationForm();
    }
}
