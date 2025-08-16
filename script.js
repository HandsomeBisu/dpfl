// Import functions from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc, 
    where, 
    getDocs, 
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// Your web app's Firebase configuration
// WARNING: Storing API keys directly in client-side code is a security risk.
// Consider using environment variables or a backend proxy for production.
const firebaseConfig = {
    apiKey: "AIzaSyAeHrxMwpArmteEWi4lIdTi54PYRDlLhks",
    authDomain: "dpflsite.firebaseapp.com",
    projectId: "dpflsite",
    storageBucket: "dpflsite.appspot.com",
    messagingSenderId: "884123413396",
    appId: "1:884123413396:web:fde6cb5f92bc1b23866fd81",
    measurementId: "G-5R72BVV5R7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- General UI Functions (Custom Alert) ---
const customAlert = document.getElementById('customAlert');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertClose = document.getElementById('customAlertClose');

function showCustomAlert(message) {
    if(!customAlert || !customAlertMessage) return;
    customAlertMessage.textContent = message;
    customAlert.classList.add('active');
}

if(customAlertClose) {
    customAlertClose.addEventListener('click', () => {
        customAlert.classList.remove('active');
    });
}

// --- Authentication ---
const actionCodeSettings = {
    url: 'http://127.0.0.1:5500/login.html', // Note: This should be your production URL later
    handleCodeInApp: true
};

// Signup
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // This is the crucial part that prevents page reload
        const username = signupForm.username.value;
        const email = signupForm.email.value;
        const password = signupForm.password.value;
        const confirmPassword = signupForm['confirm-password'].value;

        if (password !== confirmPassword) {
            showCustomAlert('비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user, actionCodeSettings);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username: username,
                email: email,
                createdAt: new Date()
            });
            await signOut(auth);
            window.location.href = 'verify-email.html';
        } catch (error) {
            console.error("Signup Error:", error);
            let message = "회원가입에 실패했습니다. ";
            if (error.code === 'auth/email-already-in-use') {
                message += '이미 사용 중인 이메일입니다.';
            } else if (error.code === 'auth/weak-password') {
                message += '비밀번호는 6자 이상이어야 합니다.';
            } else {
                message += '네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.';
            }
            showCustomAlert(message);
        }
    });
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.email.value;
        const password = loginForm.password.value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                showCustomAlert("이메일 인증이 필요합니다. 메일함을 확인해주세요.");
            } else {
                showCustomAlert("로그인 성공!");
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Login Error:", error);
            showCustomAlert("로그인 실패: 이메일 또는 비밀번호가 올바르지 않습니다.");
        }
    });
}

// Auth State Observer
onAuthStateChanged(auth, user => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        if (user && user.emailVerified) {
            navLinks.innerHTML = `
                <li><a href="team_ranking.html">팀 순위</a></li>
                <li><a href="register_player.html">선수 등록</a></li>
                <li><a href="register_team.html">팀 등록</a></li>
                <li><a href="mypage.html">마이페이지</a></li>
                <li><a href="#" id="logout-btn">로그아웃</a></li>
            `;
            document.getElementById('logout-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                await signOut(auth);
                showCustomAlert('로그아웃되었습니다.');
                window.location.href = 'index.html';
            });
        } else {
            navLinks.innerHTML = `
                <li><a href="login.html">로그인</a></li>
                <li><a href="team_ranking.html">팀 순위</a></li>
            `;
        }
    }

    if (window.location.pathname.endsWith('mypage.html')) {
        if (user && user.emailVerified) {
            loadMyPageData(user.uid);
        } else {
            showCustomAlert("로그인 후 마이페이지를 이용할 수 있습니다.");
            window.location.href = 'login.html';
        }
    }
});

// --- Access Control ---
function redirectToLoginIfNotAuthenticated() {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
        showCustomAlert('로그인 후 이용해주세요.');
        window.location.href = 'login.html';
    }
}

if (window.location.pathname.endsWith('register_player.html') || window.location.pathname.endsWith('register_team.html')) {
    onAuthStateChanged(auth, user => {
        if (!user || !user.emailVerified) {
            showCustomAlert('로그인 후 이용해주세요.');
            window.location.href = 'login.html';
        }
    });
}

// --- Team and Player Registration ---
const playerRegisterForm = document.getElementById('player-register-form');
if(playerRegisterForm){
    playerRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerName = playerRegisterForm['player-name'].value;
        const playerProfile = playerRegisterForm['player-profile'].value;

        try {
            await addDoc(collection(db, "pendingPlayers"), {
                name: playerName,
                profile: playerProfile,
                submitterUid: auth.currentUser.uid,
                requestedAt: new Date()
            });
            showCustomAlert('선수 등록 요청이 완료되었습니다. 관리자 승인을 기다려주세요.');
            playerRegisterForm.reset();
        } catch (error) {
            console.error("Player registration error:", error);
            showCustomAlert('오류가 발생했습니다. 다시 시도해주세요.');
        }
    });
}

const teamRegisterForm = document.getElementById('team-register-form');
if(teamRegisterForm){
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
            showCustomAlert('팀 등록 요청이 완료되었습니다. 관리자 승인을 기다려주세요.');
            teamRegisterForm.reset();
        } catch (error) {
            console.error("Team registration error:", error);
            showCustomAlert('오류가 발생했습니다. 다시 시도해주세요.');
        }
    });
}

// --- Data Fetching ---
const rankingBody = document.getElementById('ranking-body');
if (rankingBody) {
    const q = query(collection(db, "teams"), orderBy("승점", "desc"));
    onSnapshot(q, (querySnapshot) => {
        rankingBody.innerHTML = '';
        if(querySnapshot.empty){
            rankingBody.innerHTML = '<tr><td colspan="10">아직 등록된 팀이 없습니다.</td></tr>';
            return;
        }
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const team = doc.data();
            const row = document.createElement('tr');
            const 득실 = (team.득점 || 0) - (team.실점 || 0);
            row.innerHTML = `
                <td>${rank}</td>
                <td>${team.name}</td>
                <td>${team.경기수 || 0}</td>
                <td>${team.승점 || 0}</td>
                <td>${team.승 || 0}</td>
                <td>${team.무 || 0}</td>
                <td>${team.패 || 0}</td>
                <td>${team.득점 || 0}</td>
                <td>${team.실점 || 0}</td>
                <td>${득실}</td>
            `;
            rankingBody.appendChild(row);
            rank++;
        });
    }, (error) => {
        console.error("Error fetching rankings: ", error);
        rankingBody.innerHTML = '<tr><td colspan="10">순위를 불러오는 데 실패했습니다.</td></tr>';
    });
}

// --- MyPage Functions ---
async function loadMyPageData(uid) {
    const myTeamsList = document.getElementById('my-teams-list');
    const myPlayerProfile = document.getElementById('my-player-profile');

    if (myTeamsList) {
        myTeamsList.innerHTML = '<p class="no-data">팀 정보를 불러오는 중...</p>';
        const q = query(collection(db, "teams"), where("leader", "==", uid));
        const querySnapshot = await getDocs(q);
        myTeamsList.innerHTML = querySnapshot.empty ? '<p class="no-data">아직 등록된 팀이 없습니다.</p>' : '';
        querySnapshot.forEach((docSnapshot) => {
            const team = docSnapshot.data();
            const teamId = docSnapshot.id;
            const div = document.createElement('div');
            div.className = 'team-item';
            div.innerHTML = `
                ${team.iconUrl ? `<img src="${team.iconUrl}" alt="${team.name} Icon" class="item-icon">` : ''}
                <div class="item-details">
                    <h3>${team.name}</h3>
                    <p>${team.description}</p>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${teamId}" data-type="team">수정</button>
                    <button class="recruit-btn" data-id="${teamId}" data-name="${team.name}">선수 영입</button>
                </div>
            `;
            myTeamsList.appendChild(div);
        });
    }

    if (myPlayerProfile) {
        myPlayerProfile.innerHTML = '<p class="no-data">선수 정보를 불러오는 중...</p>';
        const q = query(collection(db, "players"), where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        myPlayerProfile.innerHTML = querySnapshot.empty ? '<p class="no-data">아직 등록된 선수 정보가 없습니다.</p>' : '';
        querySnapshot.forEach((docSnapshot) => {
            const player = docSnapshot.data();
            const playerId = docSnapshot.id;
            const div = document.createElement('div');
            div.className = 'player-item';
            div.innerHTML = `
                <div class="item-details">
                    <h3>${player.name}</h3>
                    <p>${player.profile}</p>
                    <p>소속팀: ${player.teamName || '무소속'}</p>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${playerId}" data-type="player">수정</button>
                </div>
            `;
            myPlayerProfile.appendChild(div);
        });
    }

    setupEditAndRecruitListeners();
}

function setupEditAndRecruitListeners() {
    document.body.addEventListener('click', async (e) => {
        if (e.target.matches('.edit-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            if (type === 'team') openTeamEditModal(id);
            if (type === 'player') openPlayerEditModal(id);
        }
        if (e.target.matches('.recruit-btn')) {
            const id = e.target.dataset.id;
            const name = e.target.dataset.name;
            openRecruitModal(id, name);
        }
    })}
