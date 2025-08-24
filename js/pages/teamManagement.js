import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert, showCustomConfirm } from "../ui/alerts.js";

// --- Rendering Functions ---
function renderTeamManagementHeader(team) {
    const headerEl = document.getElementById('team-management-header');
    if (headerEl) headerEl.innerHTML = `<h2>${team.name} 팀 관리</h2>`;
    document.title = `${team.name} 팀 관리 - DPFL`;
}

function renderTeamInfo(team, leaderPlayer) {
    const infoEl = document.getElementById('team-info-display');
    if (!infoEl) return;

    // Set current team icon
    const currentTeamIconEl = document.getElementById('current-team-icon');
    if (currentTeamIconEl && team.iconUrl) {
        currentTeamIconEl.src = team.iconUrl;
    }

    let leaderHtml = '<p>팀장 정보를 불러오는 중...</p>';
    if (leaderPlayer) {
        leaderHtml = `
            <div class="list-item">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${leaderPlayer.photoURL ? `<img src="${leaderPlayer.photoURL}" alt="${leaderPlayer.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #eee;"></div>'}
                    <span>${leaderPlayer.name}</span>
                </div>
            </div>
        `;
    }

    infoEl.innerHTML = `
        <p><strong>팀 이름:</strong> ${team.name}</p>
        <p><strong>팀 설명:</strong> ${team.description}</p>
        <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; border-top: 1px solid #eee; padding-top: 1rem;">팀장</h4>
        ${leaderHtml}
    `;
}

function renderTeamMembers(players, leaderUid) {
    const membersListEl = document.getElementById('team-members-list');
    if (!membersListEl) return;

    const members = players.filter(p => p.uid !== leaderUid);

    if (members.length === 0) {
        membersListEl.innerHTML = '<p class="no-data">팀장 외에 소속된 멤버가 없습니다.</p>';
        return;
    }

    membersListEl.innerHTML = '';
    members.forEach(player => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                ${player.photoURL ? `<img src="${player.photoURL}" alt="${player.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #eee;"></div>'}
                <span>${player.name}</span>
            </div>
            <button class="btn-release release-player-btn" data-player-id="${player.id}" title="방출">✖</button>
        `;
        membersListEl.appendChild(item);
    });
}

// --- Squad Maker (Moved to edit_squad.html) ---

// --- Event Listeners ---
function setupTeamManagementListeners(team, user, players) {
    const pageContainer = document.querySelector('.container');

    pageContainer.addEventListener('click', async e => {
        if (e.target.matches('.release-player-btn')) {
            const playerId = e.target.dataset.playerId;
            const confirmed = await showCustomConfirm('정말로 이 선수를 방출하시겠습니까?');
            if (confirmed) {
                await updateDoc(doc(db, "players", playerId), { teamId: null, teamName: '무소속' });
                showCustomAlert('선수를 방출했습니다.');
                initTeamManagementPage(user);
            }
        }
    });

    const recruitBtn = document.getElementById('recruit-player-btn');
    if(recruitBtn) {
        recruitBtn.href = `recruit_player.html?teamId=${team.id}`;
    }

    const editSquadBtn = document.getElementById('edit-squad-btn');
    if(editSquadBtn) {
        editSquadBtn.href = `edit_squad.html?id=${team.id}`;
    }

    document.getElementById('delete-team-btn')?.addEventListener('click', async () => {
        const confirmed = await showCustomConfirm(`정말로 '${team.name}' 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
        if (confirmed) {
            const playersQuery = query(collection(db, "players"), where("teamId", "==", team.id));
            const playersSnapshot = await getDocs(playersQuery);
            const updates = playersSnapshot.docs.map(playerDoc => 
                updateDoc(doc(db, "players", playerDoc.id), { teamId: null, teamName: '무소속' })
            );
            await Promise.all(updates);
            await deleteDoc(doc(db, "teams", team.id));
            showCustomAlert('팀이 삭제되었습니다.');
            window.location.href = 'mypage.html';
        }
    });

    document.getElementById('upload-team-icon-btn')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('team-icon-upload');
        if (fileInput.files.length === 0) {
            showCustomAlert('업로드할 파일을 선택해주세요.');
            return;
        }

        const file = fileInput.files[0];
        showCustomAlert('아이콘을 업로드 중입니다. 잠시 기다려주세요...');

        try {
            const iconUrl = await uploadToCloudinary(file);
            if (iconUrl) {
                await updateDoc(doc(db, "teams", team.id), { iconUrl: iconUrl });
                showCustomAlert('팀 아이콘이 성공적으로 변경되었습니다.');
                initTeamManagementPage(user); // Re-render the page with the new icon
            } else {
                showCustomAlert('아이콘 업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error("Error uploading team icon:", error);
            showCustomAlert('아이콘 업로드 중 오류가 발생했습니다.');
        }
    });
}

import { uploadToCloudinary } from "../cloudinary/upload.js";

// --- Page Initializer ---
export async function initTeamManagementPage(user) {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('id');
    if (!teamId) {
        showCustomAlert("잘못된 접근입니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const teamDocRef = doc(db, "teams", teamId);
    const teamDocSnap = await getDoc(teamDocRef);

    if (!teamDocSnap.exists() || teamDocSnap.data().leader !== user.uid) {
        showCustomAlert("팀을 관리할 권한이 없습니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const teamData = { id: teamDocSnap.id, ...teamDocSnap.data() };
    
    const playersQuery = query(collection(db, "players"), where("teamId", "==", teamId));
    const leaderQuery = query(collection(db, "players"), where("uid", "==", user.uid));
    const [playersSnapshot, leaderSnapshot] = await Promise.all([getDocs(playersQuery), getDocs(leaderQuery)]);

    const players = [];
    playersSnapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
    const leaderPlayer = leaderSnapshot.empty ? null : {id: leaderSnapshot.docs[0].id, ...leaderSnapshot.docs[0].data()};

    renderTeamManagementHeader(teamData);
    renderTeamInfo(teamData, leaderPlayer);
    renderTeamMembers(players, user.uid);
    
    setupTeamManagementListeners(teamData, user, players);
}

// --- Edit Page Specific Logic (remains unchanged) ---

export async function initEditTeamPage(user) {
    // ... (omitted for brevity, no changes needed here)
}

export async function initEditPlayerPage(user) {
    // ... (omitted for brevity, no changes needed here)
}