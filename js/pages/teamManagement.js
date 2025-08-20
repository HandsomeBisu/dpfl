import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { db, storage } from "../firebase/config.js";
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
        ${team.iconUrl ? `<p><strong>아이콘:</strong></p><img src="${team.iconUrl}" alt="Team Icon" style="max-width: 100px; border-radius: 8px;">` : ''}
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

async function renderFreeAgents(teamId, leaderUid, players) {
    const freeAgentsListEl = document.getElementById('free-agents-list');
    if (!freeAgentsListEl) return;

    if (players.length >= 8) {
        freeAgentsListEl.innerHTML = '<p class="no-data">팀 인원이 최대 8명에 도달하여 더 이상 선수를 영입할 수 없습니다.</p>';
        return;
    }

    freeAgentsListEl.innerHTML = '<p class="no-data">로딩 중...</p>';

    // 1. Get all free agents
    const playersQuery = query(collection(db, "players"), where("teamId", "==", null));
    const playersSnapshot = await getDocs(playersQuery);
    
    const freeAgents = [];
    playersSnapshot.forEach(doc => {
        const player = { id: doc.id, ...doc.data() };
        if (player.uid !== leaderUid) {
            freeAgents.push(player);
        }
    });

    if (freeAgents.length === 0) {
        freeAgentsListEl.innerHTML = '<p class="no-data">영입 가능한 선수가 없습니다.</p>';
        return;
    }

    // 2. Get pending requests sent by THIS team
    const requestsQuery = query(collection(db, "recruitmentRequests"), where("teamId", "==", teamId), where("status", "==", "pending"));
    const requestsSnapshot = await getDocs(requestsQuery);
    const pendingPlayerIds = requestsSnapshot.docs.map(doc => doc.data().playerId);

    // 3. Render list
    freeAgentsListEl.innerHTML = '';
    freeAgents.forEach(player => {
        const isPending = pendingPlayerIds.includes(player.id);
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                ${player.photoURL ? `<img src="${player.photoURL}" alt="${player.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #eee;"></div>'}
                <span>${player.name}</span>
            </div>
            <button class="btn-recruit recruit-player-btn" data-player-id="${player.id}" ${isPending ? 'disabled' : ''}>
                ${isPending ? '제안 보냄' : '영입 제안'}
            </button>
        `;
        freeAgentsListEl.appendChild(item);
    });
}

// --- Squad Maker ---
function createPlayerChip(player) {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    chip.dataset.playerId = player.id;

    const photoDiv = document.createElement('div');
    photoDiv.className = 'player-chip-photo';
    if (player.photoURL) {
        photoDiv.style.backgroundImage = `url(${player.photoURL})`;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-chip-name';
    nameSpan.textContent = player.name;

    chip.appendChild(photoDiv);
    chip.appendChild(nameSpan);

    return chip;
}

async function initializeSquadMaker(team, players) {
    const pitchSlots = document.querySelectorAll('.position-slot');
    const benchList = document.getElementById('bench-list');
    const saveBtn = document.getElementById('save-squad-btn');

    if (!pitchSlots.length || !benchList || !saveBtn) return;

    const savedSquad = team.squad || {};
    const placedPlayerIds = Object.values(savedSquad);

    pitchSlots.forEach(slot => slot.innerHTML = slot.dataset.position.toUpperCase());
    benchList.innerHTML = '';

    for (const position in savedSquad) {
        const playerId = savedSquad[position];
        const player = players.find(p => p.id === playerId);
        if (player) {
            const slot = document.querySelector(`.position-slot[data-position="${position}"]`);
            if (slot) {
                const playerChip = createPlayerChip(player);
                slot.innerHTML = '';
                slot.appendChild(playerChip);
            }
        }
    }

    const benchedPlayers = players.filter(p => !placedPlayerIds.includes(p.id));
    benchedPlayers.forEach(player => {
        const playerChip = createPlayerChip(player);
        benchList.appendChild(playerChip);
    });

    const sortableOptions = { group: 'squad', animation: 150, ghostClass: 'sortable-ghost' };
    if (window.sortableInstances) {
        window.sortableInstances.forEach(instance => instance.destroy());
    }
    window.sortableInstances = [];
    window.sortableInstances.push(new Sortable(benchList, sortableOptions));
    pitchSlots.forEach(slot => { window.sortableInstances.push(new Sortable(slot, sortableOptions)); });

    saveBtn.onclick = async () => {
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
            showCustomAlert('스쿼드가 성공적으로 ��장되었습니다.');
        } catch (error) {
            console.error("Error saving squad:", error);
            showCustomAlert('스쿼드 저장 중 오류가 발생했습니다.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '스쿼드 저장';
        }
    };
}

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
        if (e.target.matches('.recruit-player-btn')) {
            const recruitButton = e.target;
            
            if (players.length >= 8) {
                showCustomAlert('팀 인원이 최대 8명에 도달하여 더 이상 선수를 영입할 수 없습니다.');
                return;
            }

            const playerId = recruitButton.dataset.playerId;
            const confirmed = await showCustomConfirm('이 선수에게 영입 제안을 보내시겠습니까?');
            if (confirmed) {
                try {
                    const playersQuery = query(collection(db, "players"), where("teamId", "==", team.id));
                    const playersSnapshot = await getDocs(playersQuery);
                    if (playersSnapshot.size >= 8) {
                        showCustomAlert('이미 팀 인원이 가득 찼습니다. 새로고침 후 다시 시도해주세요.');
                        recruitButton.textContent = '영입 불가';
                        recruitButton.disabled = true;
                        return;
                    }

                    await addDoc(collection(db, "recruitmentRequests"), {
                        teamId: team.id,
                        teamName: team.name,
                        playerId: playerId,
                        status: 'pending',
                        createdAt: new Date()
                    });
                    showCustomAlert('선수에게 영입 제안을 보냈습니다.');
                    recruitButton.textContent = '제안 보냄';
                    recruitButton.disabled = true;
                } catch (error) {
                    console.error("Error sending recruitment request:", error);
                    showCustomAlert('영입 제안을 보내는 중 오류가 발생했습니다.');
                }
            }
        }
    });

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
}

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
    renderFreeAgents(teamData.id, user.uid, players);
    initializeSquadMaker(teamData, players);
    
    setupTeamManagementListeners(teamData, user, players);
}

// --- Edit Page Specific Logic (remains unchanged) ---

export async function initEditTeamPage(user) {
    // ... (omitted for brevity, no changes needed here)
}

export async function initEditPlayerPage(user) {
    // ... (omitted for brevity, no changes needed here)
}
