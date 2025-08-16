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
    getDoc,
    runTransaction
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
 const customAlertOverlay = document.getElementById('customAlert');
 const customAlertMessage = document.getElementById('customAlertMessage');
 const customAlertConfirmBtn = document.getElementById('customAlertConfirm');
 const customAlertCancelBtn = document.getElementById('customAlertCancel');
 
 // This function is for simple alerts (OK only)
 function showCustomAlert(message) {
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
 function showCustomConfirm(message) {
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
    } else if (window.location.pathname.endsWith('manage_team.html')) {
        if (user && user.emailVerified) {
            const params = new URLSearchParams(window.location.search);
            const teamId = params.get('id');
            if (teamId) {
                initializeTeamManagementPage(teamId, user);
            } else {
                showCustomAlert("잘못된 접근입니다.");
                window.location.href = 'mypage.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    } else if (window.location.pathname.endsWith('edit_team.html')) {
        if (user && user.emailVerified) {
            const params = new URLSearchParams(window.location.search);
            const teamId = params.get('id');
            if (teamId) {
                initializeTeamEditPage(teamId, user);
            } else {
                showCustomAlert("수정할 팀을 찾을 수 없습니다.");
                window.location.href = 'mypage.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    } else if (window.location.pathname.endsWith('edit_player.html')) {
        if (user && user.emailVerified) {
            const params = new URLSearchParams(window.location.search);
            const playerId = params.get('id');
            if (playerId) {
                initializePlayerEditPage(playerId, user);
            } else {
                showCustomAlert("수정할 선수 프로필을 찾을 수 없습니다.");
                window.location.href = 'mypage.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    }
});

// --- Access Control & Page-specific Logic ---

// Helper function to disable the player registration form
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
        button.style.cssText = 'margin-top: 1rem; display: block; text-decoration: none;';
        formBox.appendChild(button);
    }
}

// Logic for Player Registration Page
if (window.location.pathname.endsWith('register_player.html')) {
    onAuthStateChanged(auth, async (user) => {
        if (!user || !user.emailVerified) {
            showCustomAlert('로그인 후 이용해주세요.');
            window.location.href = 'login.html';
        } else {
            // Check if user already has a player profile or a pending request
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
    });
}

// Logic for Team Registration Page
if (window.location.pathname.endsWith('register_team.html')) {
    onAuthStateChanged(auth, user => {
        if (!user || !user.emailVerified) {
            showCustomAlert('로그인 후 이용해주세요.');
            window.location.href = 'login.html';
        }
    });
}

// --- Team and Player Registration ---
const playerRegisterForm = document.getElementById('player-register-form');
if (playerRegisterForm) {
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

            // Server-side check to prevent duplicate registration
            const playerQuery = query(collection(db, "players"), where("uid", "==", user.uid));
            const pendingPlayerQuery = query(collection(db, "pendingPlayers"), where("submitterUid", "==", user.uid));
            const [playerSnapshot, pendingPlayerSnapshot] = await Promise.all([
                getDocs(playerQuery),
                getDocs(pendingPlayerQuery)
            ]);

            if (!playerSnapshot.empty || !pendingPlayerSnapshot.empty) {
                showCustomAlert("이미 선수 등록을 했거나 요청한 상태입니다.");
                submitButton.disabled = false;
                submitButton.textContent = '등록 요청';
                return;
            }

            const playerName = document.getElementById('player-name').value;
            const playerProfile = document.getElementById('player-profile').value;

            await addDoc(collection(db, "pendingPlayers"), {
                name: playerName,
                profile: playerProfile,
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
            window.location.href = 'request-submitted.html';
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
        querySnapshot.forEach((docSnapshot) => {
            const team = docSnapshot.data();
            const teamId = docSnapshot.id;
            const row = document.createElement('tr');
            const 득실 = (team.득점 || 0) - (team.실점 || 0);
            row.innerHTML = `
                <td>${rank}</td>
                <td><a href="team_detail.html?id=${teamId}" class="team-link">${team.name}</a></td>
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

// --- Team Detail Page ---
if (window.location.pathname.endsWith('team_detail.html')) {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('id');

    if (teamId) {
        loadTeamDetails(teamId);
    } else {
        const container = document.getElementById('team-info-container');
        if (container) {
            container.innerHTML = '<div class="team-header"><h1>팀을 찾을 수 없습니다.</h1><p>올바른 경로로 접근했는지 확인해주세요.</p></div>';
        }
    }
}

async function loadTeamDetails(teamId) {
    const teamInfoContainer = document.getElementById('team-info-container');
    const membersList = document.getElementById('members-list');

    if (!teamInfoContainer || !membersList) return;

    teamInfoContainer.innerHTML = '<div class="team-header"><h1>팀 정보 로딩 중...</h1></div>';
    membersList.innerHTML = '<p class="no-data" style="text-align: center;">멤버 정보를 불러오는 중...</p>';

    try {
        // 1. Fetch Team Data
        const teamDocRef = doc(db, "teams", teamId);
        const teamDocSnap = await getDoc(teamDocRef);

        if (!teamDocSnap.exists()) {
            teamInfoContainer.innerHTML = '<div class="team-header"><h1>팀을 찾을 수 없습니다.</h1></div>';
            membersList.innerHTML = '';
            return;
        }

        const team = teamDocSnap.data();
        document.title = `${team.name} 정보 - DPFL`; // Update page title

        teamInfoContainer.innerHTML = `
            <div class="team-header">
                ${team.iconUrl ? `<img src="${team.iconUrl}" alt="${team.name} Icon" class="team-icon">` : '<div class="team-icon"></div>'}
                <h1>${team.name}</h1>
                <p>${team.description}</p>
            </div>
        `;

        // 2. Fetch Team Members
        const playersQuery = query(collection(db, "players"), where("teamId", "==", teamId), orderBy("name"));
        const playersSnapshot = await getDocs(playersQuery);

        if (playersSnapshot.empty) {
            membersList.innerHTML = '<p class="no-data" style="text-align: center;">소속된 멤버가 없습니다.</p>';
        } else {
            membersList.innerHTML = '';
            playersSnapshot.forEach(playerDoc => {
                const player = playerDoc.data();
                const memberCard = document.createElement('div');
                memberCard.className = 'member-card';
                memberCard.innerHTML = `
                    <h3>${player.name}</h3>
                    <p>${player.profile || '프로필 정보 없음'}</p>
                `;
                membersList.appendChild(memberCard);
            });
        }

    } catch (error) {
        console.error("Error loading team details:", error);
        teamInfoContainer.innerHTML = '<div class="team-header"><h1>정보를 불러오는 데 실패했습니다.</h1></div>';
        membersList.innerHTML = '<p class="no-data" style="text-align: center;">멤버 정보를 불러오는 데 실패했습니다.</p>';
    }
}

// --- MyPage Functions ---
async function loadMyPageData(uid) {
    const myManagedTeams = document.getElementById('my-managed-teams');
    const myPlayerProfile = document.getElementById('my-player-profile');

    if (myManagedTeams) {
        myManagedTeams.innerHTML = '<p class="no-data">팀 정보를 불러오는 중...</p>';
        const q = query(collection(db, "teams"), where("leader", "==", uid));
        const querySnapshot = await getDocs(q);
        myManagedTeams.innerHTML = querySnapshot.empty ? '<p class="no-data">아직 관리하는 팀이 없습니다.</p>' : '';
        querySnapshot.forEach((docSnapshot) => {
            const team = docSnapshot.data();
            const teamId = docSnapshot.id;
            const div = document.createElement('div');
            div.className = 'managed-team-item';
            div.innerHTML = `
                ${team.iconUrl ? `<img src="${team.iconUrl}" alt="${team.name} Icon" class="item-icon">` : '<div class="item-icon" style="background-color: #eee;"></div>'}
                <div class="item-details">
                    <h3>${team.name}</h3>
                    <p>${team.description.substring(0, 50)}${team.description.length > 50 ? '...' : ''}</p>
                </div>
                <a href="manage_team.html?id=${teamId}" class="btn btn-small">팀 관리</a>
            `;
            myManagedTeams.appendChild(div);
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
            div.className = 'player-item list-item';
            div.innerHTML = `
                <div class="item-details">
                    <h3>${player.name}</h3>
                    <p>${player.profile}</p>
                    <p>소속팀: ${player.teamName || '무소속'}</p>
                </div>
                <div class="item-actions">
                    <a href="edit_player.html?id=${playerId}" class="btn btn-small">프로필 수정</a>
                </div>
            `;
            myPlayerProfile.appendChild(div);
        });
    }
}

// --- Team Management Page ---

async function initializeTeamManagementPage(teamId, user) {
    const teamDocRef = doc(db, "teams", teamId);
    const teamDocSnap = await getDoc(teamDocRef);

    if (!teamDocSnap.exists() || teamDocSnap.data().leader !== user.uid) {
        showCustomAlert("팀을 관리할 권한이 없습니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const teamData = { id: teamDocSnap.id, ...teamDocSnap.data() };
    
    // Render initial content
    renderTeamManagementHeader(teamData);
    renderTeamInfo(teamData);
    await renderTeamMembers(teamId);
    await renderFreeAgents(teamId, teamData.name);

    // Initialize Squad Maker
    await initializeSquadMaker(teamData);

    // Setup event listeners
    setupTeamManagementListeners(teamData);
}

function renderTeamManagementHeader(team) {
    const headerEl = document.getElementById('team-management-header');
    if(headerEl) headerEl.innerHTML = `<h2>${team.name} 팀 관리</h2>`;
    document.title = `${team.name} 팀 관리 - DPFL`;
}

function renderTeamInfo(team) {
    const infoEl = document.getElementById('team-info-display');
    if(infoEl) {
        infoEl.innerHTML = `
            <p><strong>팀 이름:</strong> ${team.name}</p>
            <p><strong>팀 설명:</strong> ${team.description}</p>
            ${team.iconUrl ? `<p><strong>아이콘:</strong></p><img src="${team.iconUrl}" alt="Team Icon" style="max-width: 100px; border-radius: 8px;">` : ''}
        `;
    }
}

async function renderTeamMembers(teamId) {
    const membersListEl = document.getElementById('team-members-list');
    if (!membersListEl) return;
    membersListEl.innerHTML = '<p class="no-data">로딩 중...</p>';

    const q = query(collection(db, "players"), where("teamId", "==", teamId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        membersListEl.innerHTML = '<p class="no-data">소속된 멤버가 없습니다.</p>';
        return;
    }

    membersListEl.innerHTML = '';
    snapshot.forEach(playerDoc => {
        const player = playerDoc.data();
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <span>${player.name}</span>
            <button class="btn-small btn-danger release-player-btn" data-player-id="${playerDoc.id}">방출</button>
        `;
        membersListEl.appendChild(item);
    });
}

async function renderFreeAgents(teamId, teamName) {
    const freeAgentsListEl = document.getElementById('free-agents-list');
    if (!freeAgentsListEl) return;
    freeAgentsListEl.innerHTML = '<p class="no-data">로딩 중...</p>';

    const q = query(collection(db, "players"), where("teamId", "==", null));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        freeAgentsListEl.innerHTML = '<p class="no-data">영입 가능한 선수가 없습니다.</p>';
        return;
    }

    freeAgentsListEl.innerHTML = '';
    snapshot.forEach(playerDoc => {
        const player = playerDoc.data();
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <span>${player.name}</span>
            <button class="btn-small recruit-player-btn" data-player-id="${playerDoc.id}">영입</button>
        `;
        freeAgentsListEl.appendChild(item);
    });
}

function setupTeamManagementListeners(team) {
    const pageContainer = document.querySelector('.container');

    pageContainer.addEventListener('click', async e => {
        if (e.target.matches('.release-player-btn')) {
            const playerId = e.target.dataset.playerId;
            const confirmed = await showCustomConfirm('정말로 이 선수를 방출하시겠습니까?');
            if (confirmed) {
                await updateDoc(doc(db, "players", playerId), { teamId: null, teamName: '무소속' });
                showCustomAlert('선수를 방출했습니다.');
                renderTeamMembers(team.id);
                renderFreeAgents(team.id, team.name);
            }
        }
        if (e.target.matches('.recruit-player-btn')) {
            const playerId = e.target.dataset.playerId;
            const confirmed = await showCustomConfirm('이 선수를 팀에 영입하시겠습니까?');
            if (confirmed) {
                await updateDoc(doc(db, "players", playerId), { teamId: team.id, teamName: team.name });
                showCustomAlert('선수를 영입했습니다.');
                renderTeamMembers(team.id);
                renderFreeAgents(team.id, team.name);
            }
        }
    });

    // Set Edit Team Info Link
    const editLink = document.getElementById('edit-team-info-link');
    if (editLink) {
        editLink.href = `edit_team.html?id=${team.id}`;
    }

    // Delete Team Button
    document.getElementById('delete-team-btn').addEventListener('click', async () => {
        const confirmed = await showCustomConfirm(`정말로 '${team.name}' 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
        if (confirmed) {
            await deleteRegisteredItem(team.id, 'teams');
            showCustomAlert('팀이 삭제되었습니다.');
            window.location.href = 'mypage.html';
        }
    });
}

// --- Team Edit Page ---
async function initializeTeamEditPage(teamId, user) {
    const teamDocRef = doc(db, "teams", teamId);
    const teamDocSnap = await getDoc(teamDocRef);

    if (!teamDocSnap.exists() || teamDocSnap.data().leader !== user.uid) {
        showCustomAlert("팀을 수정할 권한이 없습니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const teamData = teamDocSnap.data();
    const form = document.getElementById('edit-team-form');
    const nameInput = document.getElementById('team-name');
    const descInput = document.getElementById('team-description');
    const iconContainer = document.getElementById('current-team-icon');

    if (form && nameInput && descInput && iconContainer) {
        nameInput.value = teamData.name;
        descInput.value = teamData.description;
        if (teamData.iconUrl) {
            iconContainer.innerHTML = `
                <label>현재 아이콘</label>
                <img src="${teamData.iconUrl}" alt="Current Team Icon" style="max-width: 80px; max-height: 80px; border-radius: 8px; margin-top: 0.5rem;">
            `;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = '저장 중...';

            const newIconFile = document.getElementById('team-icon').files[0];
            const updatedData = {
                name: nameInput.value,
                description: descInput.value,
            };

            try {
                if (newIconFile) {
                    const storageRef = ref(storage, `team-icons/${Date.now()}_${newIconFile.name}`);
                    await uploadBytes(storageRef, newIconFile);
                    updatedData.iconUrl = await getDownloadURL(storageRef);
                }
                await updateDoc(doc(db, "teams", teamId), updatedData);
                showCustomAlert('팀 정보가 성공적으로 수정되었습니다.');
                setTimeout(() => {
                    window.location.href = `manage_team.html?id=${teamId}`;
                }, 1500);
            } catch (error) {
                console.error("Error updating team:", error);
                showCustomAlert('팀 정보 수정 중 오류가 발생했습니다.');
                submitButton.disabled = false;
                submitButton.textContent = '정보 저장';
            }
        });
    }
}

// --- Squad Maker ---

async function initializeSquadMaker(team) {
    const pitchSlots = document.querySelectorAll('.position-slot');
    const benchList = document.getElementById('bench-list');
    const saveBtn = document.getElementById('save-squad-btn');

    if (!pitchSlots.length || !benchList || !saveBtn) return;

    // 1. Fetch all players of the team
    const playersQuery = query(collection(db, "players"), where("teamId", "==", team.id));
    const playersSnapshot = await getDocs(playersQuery);
    const players = [];
    playersSnapshot.forEach(doc => {
        players.push({ id: doc.id, ...doc.data() });
    });

    // 2. Get saved squad and distribute players
    const savedSquad = team.squad || {};
    const placedPlayerIds = Object.values(savedSquad);

    // Clear existing elements and set default text
    pitchSlots.forEach(slot => slot.innerHTML = slot.dataset.position.toUpperCase());
    benchList.innerHTML = '';

    // Place players on the pitch based on saved data
    for (const position in savedSquad) {
        const playerId = savedSquad[position];
        const player = players.find(p => p.id === playerId);
        if (player) {
            const slot = document.querySelector(`.position-slot[data-position="${position}"]`);
            if (slot) {
                const playerChip = createPlayerChip(player);
                slot.innerHTML = ''; // Clear position text
                slot.appendChild(playerChip);
            }
        }
    }

    // Place remaining players on the bench
    const benchedPlayers = players.filter(p => !placedPlayerIds.includes(p.id));
    benchedPlayers.forEach(player => {
        const playerChip = createPlayerChip(player);
        benchList.appendChild(playerChip);
    });

    // 3. Initialize SortableJS
    const sortableOptions = {
        group: 'squad',
        animation: 150,
        ghostClass: 'sortable-ghost',
    };

    new Sortable(benchList, sortableOptions);
    pitchSlots.forEach(slot => { new Sortable(slot, sortableOptions); });

    // 4. Setup Save Button
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';

        const newSquad = {};
        pitchSlots.forEach(slot => {
            const playerChip = slot.querySelector('.player-chip');
            if (playerChip) {
                newSquad[slot.dataset.position] = playerChip.dataset.playerId;
            }
        });

        try {
            await updateDoc(doc(db, "teams", team.id), { squad: newSquad });
            showCustomAlert('스쿼드가 성공적으로 저장되었습니다.');
        } catch (error) {
            console.error("Error saving squad:", error);
            showCustomAlert('스쿼드 저장 중 오류가 발생했습니다.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '스쿼드 저장';
        }
    });
}

function createPlayerChip(player) {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    chip.textContent = player.name;
    chip.dataset.playerId = player.id;
    return chip;
}

// --- Player Edit Page ---
async function initializePlayerEditPage(playerId, user) {
    const playerDocRef = doc(db, "players", playerId);
    const playerDocSnap = await getDoc(playerDocRef);

    if (!playerDocSnap.exists() || playerDocSnap.data().uid !== user.uid) {
        showCustomAlert("프로필을 수정할 권한이 없습니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const playerData = playerDocSnap.data();
    const form = document.getElementById('edit-player-form');
    const nameInput = document.getElementById('player-name');
    const profileInput = document.getElementById('player-profile');

    if (form && nameInput && profileInput) {
        nameInput.value = playerData.name;
        profileInput.value = playerData.profile;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = '저장 중...';

            const updatedData = {
                name: nameInput.value,
                profile: profileInput.value,
            };

            try {
                await updateDoc(playerDocRef, updatedData);
                
                // Also update the name in the users collection if it exists
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, { username: updatedData.name });

                showCustomAlert('프로필이 성공적으로 수정되었습니다.');
                setTimeout(() => {
                    window.location.href = 'mypage.html';
                }, 1500);

            } catch (error) {
                console.error("Error updating player profile:", error);
                showCustomAlert('프로필 수정 중 오류가 발생했습니다.');
                submitButton.disabled = false;
                submitButton.textContent = '정보 저장';
            }
        });
    }
}

// --- Admin Panel ---
if (window.location.pathname.endsWith('admin.html')) {
    // This password should be kept secure, ideally not in client-side code for production.
    const password = prompt("관리자 비밀번호를 입력하세요:");
    if (password === "qh119357") { 
        const adminContent = document.getElementById('admin-content');
        if(adminContent) adminContent.style.display = 'block';
        
        // Load pending items for approval
        loadPendingItems('pendingPlayers', 'pending-players', '선수');
        loadPendingItems('pendingTeams', 'pending-teams', '팀');
        
        // Load teams for match management
        loadTeamsForMatchManagement();

        // Load registered items for management
        loadRegisteredItems('players', 'registered-players-list', '선수');
        loadRegisteredItems('teams', 'registered-teams-list', '팀');

        // Setup event listeners for modals and buttons
        setupAdminEventListeners();
    } else {
        showCustomAlert("비밀번호가 틀렸습니다.");
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
}

async function loadPendingItems(collectionName, elementId, itemType) {
    const container = document.getElementById(elementId);
    if(!container) return;

    const q = query(collection(db, collectionName), orderBy("requestedAt", "desc"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if(snapshot.empty){
            container.innerHTML = `<p>승인 대기중인 ${itemType}이(가) 없습니다.</p>`;
            return;
        }
        snapshot.forEach(docSnapshot => {
            const item = docSnapshot.data();
            const div = document.createElement('div');
            div.className = 'pending-item'; // You can style this class in style.css
            let content = `<p><strong>${itemType} 이름:</strong> ${item.name}</p>`;
            if(item.profile) content += `<p><strong>프로필:</strong> ${item.profile}</p>`;
            if(item.description) content += `<p><strong>설명:</strong> ${item.description}</p>`;
            if(item.iconUrl) content += `<img src="${item.iconUrl}" width="50" alt="Team Icon" style="border-radius: 5px; margin-top: 5px;">`;
            div.innerHTML = content;

            const approveBtn = document.createElement('button');
            approveBtn.textContent = '승인';
            approveBtn.className = 'btn-small'; // Style this class
            approveBtn.onclick = () => approveItem(collectionName, docSnapshot.id, item);
            div.appendChild(approveBtn);

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = '거절';
            rejectBtn.className = 'btn-small btn-danger'; // Style this class
            rejectBtn.style.marginLeft = '10px';
            rejectBtn.onclick = () => rejectItem(collectionName, docSnapshot.id);
            div.appendChild(rejectBtn);

            container.appendChild(div);
        });
    });
}

async function approveItem(collectionName, docId, itemData) {
    try {
        if(collectionName === 'pendingPlayers') {
            await addDoc(collection(db, 'players'), { 
                ...itemData, 
                teamId: null, 
                teamName: '무소속', 
                uid: itemData.submitterUid 
            }); 
        } else if (collectionName === 'pendingTeams') {
            const teamData = { 
                ...itemData, 
                경기수: 0, 승점: 0, 승: 0, 무: 0, 패: 0, 득점: 0, 실점: 0 
            };
            await addDoc(collection(db, 'teams'), teamData);
        }
        await deleteDoc(doc(db, collectionName, docId));
        showCustomAlert('성공적으로 승인되었습니다.');
    } catch (error) {
        console.error('Approval Error:', error);
        showCustomAlert('승인 중 오류가 발생했습니다.');
    }
}

async function rejectItem(collectionName, docId) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        showCustomAlert('성공적으로 거절되었습니다.');
    } catch (error) {
        console.error('Rejection Error:', error);
        showCustomAlert('거절 중 오류가 발생했습니다.');
    }
}

// --- Admin Panel: Registered Item Management ---

function loadRegisteredItems(collectionName, elementId, itemType) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const q = query(collection(db, collectionName), orderBy("name"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = `<p>등록된 ${itemType}이(가) 없습니다.</p>`;
            return;
        }
        snapshot.forEach(docSnapshot => {
            const item = docSnapshot.data();
            const itemId = docSnapshot.id;
            const div = document.createElement('div');
            div.className = 'registered-item';

            let infoHtml = `<div class="item-info"><strong>${item.name}</strong>`;
            if (itemType === '선수') {
                infoHtml += `<span> - ${item.teamName || '무소속'}</span>`;
            }
            infoHtml += `</div>`;

            div.innerHTML = `
                ${infoHtml}
                <div class="item-actions">
                    <button class="btn-small edit-btn" data-id="${itemId}" data-type="${collectionName}">수정</button>
                    <button class="btn-small btn-danger delete-btn" data-id="${itemId}" data-type="${collectionName}">삭제</button>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

function setupAdminEventListeners() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    // Event delegation for edit and delete buttons
    adminContent.addEventListener('click', e => {
        if (e.target.matches('.edit-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            openAdminEditModal(id, type);
        }
        if (e.target.matches('.delete-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            deleteRegisteredItem(id, type);
        }
    });

    // Modal close buttons
    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // Modal form submissions
    document.getElementById('adminEditPlayerForm')?.addEventListener('submit', savePlayerChanges);
    document.getElementById('adminEditTeamForm')?.addEventListener('submit', saveTeamChanges);
}

async function openAdminEditModal(id, type) {
    const docRef = doc(db, type, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        showCustomAlert('데이터를 찾을 수 없습니다.');
        return;
    }
    const data = docSnap.data();

    if (type === 'players') {
        document.getElementById('editPlayerId').value = id;
        document.getElementById('editPlayerName').value = data.name;
        document.getElementById('editPlayerProfile').value = data.profile;
        document.getElementById('adminPlayerEditModal').style.display = 'flex';
    } else if (type === 'teams') {
        document.getElementById('editTeamId').value = id;
        document.getElementById('editTeamName').value = data.name;
        document.getElementById('editTeamDescription').value = data.description;
        document.getElementById('adminTeamEditModal').style.display = 'flex';
    }
}

async function savePlayerChanges(e) {
    e.preventDefault();
    const playerId = document.getElementById('editPlayerId').value;
    const updatedData = {
        name: document.getElementById('editPlayerName').value,
        profile: document.getElementById('editPlayerProfile').value,
    };
    try {
        await updateDoc(doc(db, "players", playerId), updatedData);
        showCustomAlert('선수 정보가 업데이트되었습니다.');
        document.getElementById('adminPlayerEditModal').style.display = 'none';
    } catch (error) {
        console.error("Error updating player:", error);
        showCustomAlert('업데이트 중 오류가 발생했습니다.');
    }
}

async function saveTeamChanges(e) {
    e.preventDefault();
    const teamId = document.getElementById('editTeamId').value;
    const newIconFile = document.getElementById('editTeamIcon').files[0];
    const updatedData = {
        name: document.getElementById('editTeamName').value,
        description: document.getElementById('editTeamDescription').value,
    };

    try {
        if (newIconFile) {
            const storageRef = ref(storage, `team-icons/${Date.now()}_${newIconFile.name}`);
            await uploadBytes(storageRef, newIconFile);
            updatedData.iconUrl = await getDownloadURL(storageRef);
        }
        await updateDoc(doc(db, "teams", teamId), updatedData);
        showCustomAlert('팀 정보가 업데이트되었습니다.');
        document.getElementById('adminTeamEditModal').style.display = 'none';
        document.getElementById('editTeamIcon').value = ''; // Clear file input
    } catch (error) {
        console.error("Error updating team:", error);
        showCustomAlert('업데이트 중 오류가 발생했습니다.');
    }
}

async function deleteRegisteredItem(id, type) {
    const itemType = type === 'players' ? '선수' : '팀';
    const confirmed = await showCustomConfirm(`정말로 이 ${itemType}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) {
        return;
    }

    try {
        // If deleting a team, first update its players to be unassigned
        if (type === 'teams') {
            const playersQuery = query(collection(db, "players"), where("teamId", "==", id));
            const playersSnapshot = await getDocs(playersQuery);
            const updates = playersSnapshot.docs.map(playerDoc => 
                updateDoc(doc(db, "players", playerDoc.id), { teamId: null, teamName: '무소속' })
            );
            await Promise.all(updates);
        }

        // Delete the item itself
        await deleteDoc(doc(db, type, id));
        showCustomAlert(`${itemType}이(가) 성공적으로 삭제되었습니다.`);
    } catch (error) {
        console.error(`Error deleting ${itemType}:`, error);
        showCustomAlert('삭제 중 오류가 발생했습니다.');
    }
}

// --- Match Result Management (Admin Panel) ---
async function loadTeamsForMatchManagement() {
    const homeSelect = document.getElementById('home-team-select');
    const awaySelect = document.getElementById('away-team-select');
    const applyBtn = document.getElementById('apply-result-btn');

    if (!homeSelect || !awaySelect || !applyBtn) return;

    try {
        const q = query(collection(db, "teams"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
            const team = doc.data();
            const optionHome = document.createElement('option');
            optionHome.value = doc.id;
            optionHome.textContent = team.name;
            homeSelect.appendChild(optionHome);

            const optionAway = document.createElement('option');
            optionAway.value = doc.id;
            optionAway.textContent = team.name;
            awaySelect.appendChild(optionAway);
        });

        // 결과 반영 버튼 클릭 이벤트
        applyBtn.addEventListener('click', async () => {
            const homeTeamId = homeSelect.value;
            const awayTeamId = awaySelect.value;
            const homeScoreStr = document.getElementById('home-score').value;
            const awayScoreStr = document.getElementById('away-score').value;

            // --- 입력값 검증 ---
            if (!homeTeamId || !awayTeamId) {
                showCustomAlert('홈 팀과 원정 팀을 모두 선택해주세요.');
                return;
            }
            if (homeTeamId === awayTeamId) {
                showCustomAlert('홈 팀과 원정 팀은 같을 수 없습니다.');
                return;
            }
            if (homeScoreStr === '' || awayScoreStr === '') {
                showCustomAlert('점수를 입력해주세요.');
                return;
            }

            const homeScore = parseInt(homeScoreStr, 10);
            const awayScore = parseInt(awayScoreStr, 10);

            if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
                showCustomAlert('유효한 점수(0 이상의 숫자)를 입력해주세요.');
                return;
            }

            applyBtn.disabled = true;
            applyBtn.textContent = '반영 중...';

            try {
                // --- 트랜잭션을 사용하여 데이터 업데이트 (원자적 연산 보장) ---
                await runTransaction(db, async (transaction) => {
                    const homeTeamRef = doc(db, "teams", homeTeamId);
                    const awayTeamRef = doc(db, "teams", awayTeamId);

                    const homeTeamDoc = await transaction.get(homeTeamRef);
                    const awayTeamDoc = await transaction.get(awayTeamRef);

                    if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
                        throw new Error("팀 정보를 찾을 수 없습니다.");
                    }

                    const homeData = homeTeamDoc.data();
                    const awayData = awayTeamDoc.data();

                    // 경기 결과에 따른 데이터 계산
                    const homeUpdate = { 경기수: (homeData.경기수 || 0) + 1, 득점: (homeData.득점 || 0) + homeScore, 실점: (homeData.실점 || 0) + awayScore };
                    const awayUpdate = { 경기수: (awayData.경기수 || 0) + 1, 득점: (awayData.득점 || 0) + awayScore, 실점: (awayData.실점 || 0) + homeScore };

                    if (homeScore > awayScore) { // 홈팀 승리
                        homeUpdate.승 = (homeData.승 || 0) + 1;
                        homeUpdate.승점 = (homeData.승점 || 0) + 3;
                        awayUpdate.패 = (awayData.패 || 0) + 1;
                    } else if (awayScore > homeScore) { // 원정팀 승리
                        awayUpdate.승 = (awayData.승 || 0) + 1;
                        awayUpdate.승점 = (awayData.승점 || 0) + 3;
                        homeUpdate.패 = (homeData.패 || 0) + 1;
                    } else { // 무승부
                        homeUpdate.무 = (homeData.무 || 0) + 1;
                        homeUpdate.승점 = (homeData.승점 || 0) + 1;
                        awayUpdate.무 = (awayData.무 || 0) + 1;
                        awayUpdate.승점 = (awayData.승점 || 0) + 1;
                    }

                    transaction.update(homeTeamRef, homeUpdate);
                    transaction.update(awayTeamRef, awayUpdate);
                });

                showCustomAlert('경기 결과가 성공적으로 반영되었습니다.');
                // 입력 필드 초기화
                document.getElementById('home-score').value = '';
                document.getElementById('away-score').value = '';
                homeSelect.selectedIndex = 0;
                awaySelect.selectedIndex = 0;

            } catch (error) {
                console.error("Error applying match result: ", error);
                showCustomAlert(`경기 결과 반영 실패: ${error.message}`);
            } finally {
                applyBtn.disabled = false;
                applyBtn.textContent = '결과 반영';
            }
        });
    } catch (error) {
        console.error("Error loading teams for match management: ", error);
        showCustomAlert('팀 목록을 불러오는 데 실패했습니다.');
    }
}
