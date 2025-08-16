import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDoc, updateDoc, where, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert, showCustomConfirm } from "../ui/alerts.js";

// --- Data Loading ---
function loadPendingItems(collectionName, elementId, itemType) {
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
            div.className = 'pending-item';
            let content = `<p><strong>${itemType} 이름:</strong> ${item.name}</p>`;
            if(item.profile) content += `<p><strong>프로필:</strong> ${item.profile}</p>`;
            if(item.description) content += `<p><strong>설명:</strong> ${item.description}</p>`;
            if(item.iconUrl) content += `<img src="${item.iconUrl}" width="50" alt="Team Icon" style="border-radius: 5px; margin-top: 5px;">`;
            if(item.photoURL) content += `<img src="${item.photoURL}" width="50" alt="Player Photo" style="border-radius: 50%; margin-top: 5px; object-fit: cover; height: 50px;">`;
            div.innerHTML = content;

            const approveBtn = document.createElement('button');
            approveBtn.textContent = '승인';
            approveBtn.className = 'btn-small';
            approveBtn.onclick = () => approveItem(collectionName, docSnapshot.id, item);
            div.appendChild(approveBtn);

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = '거절';
            rejectBtn.className = 'btn-small btn-danger';
            rejectBtn.style.marginLeft = '10px';
            rejectBtn.onclick = () => rejectItem(collectionName, docSnapshot.id);
            div.appendChild(rejectBtn);

            container.appendChild(div);
        });
    });
}

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

async function loadTeamsForMatchManagement() {
    const homeSelect = document.getElementById('home-team-select');
    const awaySelect = document.getElementById('away-team-select');
    if (!homeSelect || !awaySelect) return;

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
    } catch (error) {
        console.error("Error loading teams for match management: ", error);
        showCustomAlert('팀 목록을 불러오는 데 실패했습니다.');
    }
}

// --- Actions ---
async function approveItem(collectionName, docId, itemData) {
    try {
        if (collectionName === 'pendingPlayers') {
            await addDoc(collection(db, 'players'), {
                ...itemData,
                teamId: null,
                teamName: '무소속',
                uid: itemData.submitterUid
            });
        } else if (collectionName === 'pendingTeams') {
            const teamData = {
                ...itemData,
                matchesPlayed: 0,
                points: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0
            };
            const newTeamRef = await addDoc(collection(db, 'teams'), teamData);

            // Automatically assign the leader to the new team
            const leaderPlayerQuery = query(collection(db, "players"), where("uid", "==", itemData.leader));
            const leaderPlayerSnapshot = await getDocs(leaderPlayerQuery);

            if (!leaderPlayerSnapshot.empty) {
                const leaderPlayerDoc = leaderPlayerSnapshot.docs[0];
                await updateDoc(leaderPlayerDoc.ref, {
                    teamId: newTeamRef.id,
                    teamName: teamData.name
                });
            }
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

async function deleteRegisteredItem(id, type) {
    const itemType = type === 'players' ? '선수' : '팀';
    const confirmed = await showCustomConfirm(`정말로 이 ${itemType}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    try {
        if (type === 'teams') {
            const playersQuery = query(collection(db, "players"), where("teamId", "==", id));
            const playersSnapshot = await getDocs(playersQuery);
            const updates = playersSnapshot.docs.map(playerDoc => 
                updateDoc(doc(db, "players", playerDoc.id), { teamId: null, teamName: '무소속' })
            );
            await Promise.all(updates);
        }
        await deleteDoc(doc(db, type, id));
        showCustomAlert(`${itemType}이(가) 성공적으로 삭제되었습니다.`);
    } catch (error) {
        console.error(`Error deleting ${itemType}:`, error);
        showCustomAlert('삭제 중 오류가 발생했습니다.');
    }
}

// --- Modals and Forms ---
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
    const updatedData = {
        name: document.getElementById('editTeamName').value,
        description: document.getElementById('editTeamDescription').value,
    };
    try {
        await updateDoc(doc(db, "teams", teamId), updatedData);
        showCustomAlert('팀 정보가 업데이트되었습니다.');
        document.getElementById('adminTeamEditModal').style.display = 'none';
    } catch (error) {
        console.error("Error updating team:", error);
        showCustomAlert('업데이트 중 오류가 발생했습니다.');
    }
}

async function applyMatchResult() {
    const homeTeamId = document.getElementById('home-team-select').value;
    const awayTeamId = document.getElementById('away-team-select').value;
    const homeScoreStr = document.getElementById('home-score').value;
    const awayScoreStr = document.getElementById('away-score').value;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || homeScoreStr === '' || awayScoreStr === '') {
        showCustomAlert('모든 필드를 올바르게 선택하고 입력해주세요.');
        return;
    }

    const homeScore = parseInt(homeScoreStr, 10);
    const awayScore = parseInt(awayScoreStr, 10);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        showCustomAlert('유효한 점수(0 이상의 숫자)를 입력해주세요.');
        return;
    }

    const applyBtn = document.getElementById('apply-result-btn');
    applyBtn.disabled = true;
    applyBtn.textContent = '반영 중...';

    try {
        await runTransaction(db, async (transaction) => {
            const homeTeamRef = doc(db, "teams", homeTeamId);
            const awayTeamRef = doc(db, "teams", awayTeamId);
            const homeTeamDoc = await transaction.get(homeTeamRef);
            const awayTeamDoc = await transaction.get(awayTeamRef);

            if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) throw new Error("팀 정보를 찾을 수 없습니다.");

            const homeData = homeTeamDoc.data();
            const awayData = awayTeamDoc.data();

            const homeUpdate = {
                matchesPlayed: (homeData.matchesPlayed || 0) + 1,
                goalsFor: (homeData.goalsFor || 0) + homeScore,
                goalsAgainst: (homeData.goalsAgainst || 0) + awayScore,
                points: (homeData.points || 0)
            };
            const awayUpdate = {
                matchesPlayed: (awayData.matchesPlayed || 0) + 1,
                goalsFor: (awayData.goalsFor || 0) + awayScore,
                goalsAgainst: (awayData.goalsAgainst || 0) + homeScore,
                points: (awayData.points || 0)
            };

            if (homeScore > awayScore) {
                homeUpdate.wins = (homeData.wins || 0) + 1;
                homeUpdate.points += 3;
                awayUpdate.losses = (awayData.losses || 0) + 1;
            } else if (awayScore > homeScore) {
                awayUpdate.wins = (awayData.wins || 0) + 1;
                awayUpdate.points += 3;
                homeUpdate.losses = (homeData.losses || 0) + 1;
            } else {
                homeUpdate.draws = (homeData.draws || 0) + 1;
                homeUpdate.points += 1;
                awayUpdate.draws = (awayData.draws || 0) + 1;
                awayUpdate.points += 1;
            }

            // Calculate goal difference
            homeUpdate.goalDifference = homeUpdate.goalsFor - homeUpdate.goalsAgainst;
            awayUpdate.goalDifference = awayUpdate.goalsFor - awayUpdate.goalsAgainst;

            transaction.update(homeTeamRef, homeUpdate);
            transaction.update(awayTeamRef, awayUpdate);
        });

        showCustomAlert('경기 결과가 성공적으로 반영되었습니다.');
        document.getElementById('home-score').value = '';
        document.getElementById('away-score').value = '';
        document.getElementById('home-team-select').selectedIndex = 0;
        document.getElementById('away-team-select').selectedIndex = 0;

    } catch (error) {
        console.error("Error applying match result: ", error);
        showCustomAlert(`경기 결과 반영 실패: ${error.message}`);
    } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = '결과 반영';
    }
}

// --- Event Listeners ---
function setupAdminEventListeners() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    adminContent.addEventListener('click', e => {
        if (e.target.matches('.edit-btn')) {
            openAdminEditModal(e.target.dataset.id, e.target.dataset.type);
        }
        if (e.target.matches('.delete-btn')) {
            deleteRegisteredItem(e.target.dataset.id, e.target.dataset.type);
        }
    });

    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    document.getElementById('adminEditPlayerForm')?.addEventListener('submit', savePlayerChanges);
    document.getElementById('adminEditTeamForm')?.addEventListener('submit', saveTeamChanges);
    document.getElementById('apply-result-btn')?.addEventListener('click', applyMatchResult);
}

// --- Page Initializer ---
export function initAdminPage() {
    const password = prompt("관리자 비밀번호를 입력하세요:");
    // IMPORTANT: Hardcoding passwords in client-side code is a major security risk.
    // This is for demonstration purposes only. Use a proper auth system in production.
    if (password === "qh119357") { 
        const adminContent = document.getElementById('admin-content');
        if(adminContent) adminContent.style.display = 'block';
        
        loadPendingItems('pendingPlayers', 'pending-players', '선수');
        loadPendingItems('pendingTeams', 'pending-teams', '팀');
        loadTeamsForMatchManagement();
        loadRegisteredItems('players', 'registered-players-list', '선수');
        loadRegisteredItems('teams', 'registered-teams-list', '팀');
        setupAdminEventListeners();
    } else {
        showCustomAlert("비밀번호가 틀렸습니다.");
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
}
