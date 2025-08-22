import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDoc, updateDoc, where, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert, showCustomConfirm } from "../ui/alerts.js";

let allPlayers = [];

// --- Data Loading ---
async function loadAllPlayers() {
    try {
        const q = query(collection(db, "players"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        allPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error loading all players:", error);
    }
}

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

function loadMatches() {
    const container = document.getElementById('matches-list-body');
    if (!container) return;

    const q = query(collection(db, "matches"), orderBy("date", "desc"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = `<tr><td colspan="5" style="text-align: center;">등록된 경기가 없습니다.</td></tr>`;
            return;
        }
        snapshot.forEach(docSnapshot => {
            const match = docSnapshot.data();
            const matchId = docSnapshot.id;
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${match.date}</td>
                <td>${match.homeTeamName}</td>
                <td>${match.homeScore !== null ? match.homeScore : ''} : ${match.awayScore !== null ? match.awayScore : ''}</td>
                <td>${match.awayTeamName}</td>
                <td>
                    <button class="btn-small edit-match-btn" data-id="${matchId}">수정</button>
                    <button class="btn-small btn-danger delete-match-btn" data-id="${matchId}">삭제</button>
                </td>
            `;
            container.appendChild(row);
        });
    });
}

async function loadTeamsForMatchManagement() {
    const selects = [
        document.getElementById('home-team-select'),
        document.getElementById('away-team-select'),
        document.getElementById('schedule-home-team-select'),
        document.getElementById('schedule-away-team-select')
    ].filter(Boolean);

    if (selects.length === 0) return;

    try {
        const q = query(collection(db, "teams"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        const teams = [];
        querySnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });

        selects.forEach(select => {
            select.innerHTML = '<option value="">팀 선택</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            });
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

async function openMatchEditModal(matchId) {
    const modal = document.getElementById('adminMatchEditModal');
    if (!modal) return;

    const matchRef = doc(db, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
        showCustomAlert('경기를 찾을 수 없습니다.');
        return;
    }

    const match = matchSnap.data();

    document.getElementById('editMatchId').value = matchId;
    document.getElementById('editMatchDate').value = match.date;
    document.getElementById('editHomeTeamName').textContent = match.homeTeamName;
    document.getElementById('editAwayTeamName').textContent = match.awayTeamName;
    document.getElementById('editHomeScore').value = match.homeScore;
    document.getElementById('editAwayScore').value = match.awayScore;

    const scorersContainer = document.getElementById('scorers-management-section');
    scorersContainer.innerHTML = '';
    if (match.scorers && Array.isArray(match.scorers)) {
        match.scorers.forEach(scorer => addScorerRow(scorer.playerId, scorer.goals, scorer.timestamp));
    }

    const assistsContainer = document.getElementById('assists-management-section');
    assistsContainer.innerHTML = '';
    if (match.assists && Array.isArray(match.assists)) {
        match.assists.forEach(assist => addAssistRow(assist.playerId, assist.timestamp));
    }

    const cardsContainer = document.getElementById('cards-management-section');
    cardsContainer.innerHTML = '';
    if (match.cards && Array.isArray(match.cards)) {
        match.cards.forEach(card => addCardRow(card.playerId, card.cardType, card.timestamp));
    }

    const mvpSelect = document.getElementById('editMatchMVP');
    const summaryText = document.getElementById('editMatchSummary');
    summaryText.value = match.report_summary || '';

    const homePlayers = allPlayers.filter(p => p.teamId === match.homeTeamId);
    const awayPlayers = allPlayers.filter(p => p.teamId === match.awayTeamId);
    const matchPlayers = [...homePlayers, ...awayPlayers];

    mvpSelect.innerHTML = '<option value="">MVP 선택</option>';
    matchPlayers.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = `${player.name} (${player.teamName})`;
        if (match.report_mvp === player.id) {
            option.selected = true;
        }
        mvpSelect.appendChild(option);
    });

    modal.style.display = 'flex';
}

function addScorerRow(selectedPlayerId = '', goals = 1, timestamp = '') {
    const scorersContainer = document.getElementById('scorers-management-section');
    const scorerDiv = document.createElement('div');
    scorerDiv.className = 'scorer-row';
    scorerDiv.style.display = 'flex';
    scorerDiv.style.gap = '1rem';
    scorerDiv.style.marginBottom = '0.5rem';
    scorerDiv.style.alignItems = 'center';

    const playerSelect = document.createElement('select');
    playerSelect.className = 'scorer-player-select';
    playerSelect.style.flex = '1';
    playerSelect.required = true;
    playerSelect.innerHTML = '<option value="">선수 선택</option>';
    allPlayers.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = `${player.name} (${player.teamName || '무소속'})`;
        if (player.id === selectedPlayerId) option.selected = true;
        playerSelect.appendChild(option);
    });

    const goalsInput = document.createElement('input');
    goalsInput.type = 'number';
    goalsInput.className = 'scorer-goals-input';
    goalsInput.value = goals;
    goalsInput.min = 1;
    goalsInput.required = true;
    goalsInput.style.width = '60px';

    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'event-time-input';
    timeInput.placeholder = "시간 (예: 전반 10:30)";
    timeInput.value = timestamp;
    timeInput.style.width = '120px';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '삭제';
    removeBtn.className = 'btn-small btn-danger';
    removeBtn.onclick = () => scorerDiv.remove();

    scorerDiv.appendChild(playerSelect);
    scorerDiv.appendChild(goalsInput);
    scorerDiv.appendChild(timeInput);
    scorerDiv.appendChild(removeBtn);
    scorersContainer.appendChild(scorerDiv);
}

function addAssistRow(selectedPlayerId = '', timestamp = '') {
    const assistsContainer = document.getElementById('assists-management-section');
    const assistDiv = document.createElement('div');
    assistDiv.className = 'assist-row';
    assistDiv.style.display = 'flex';
    assistDiv.style.gap = '1rem';
    assistDiv.style.marginBottom = '0.5rem';
    assistDiv.style.alignItems = 'center';

    const playerSelect = document.createElement('select');
    playerSelect.className = 'assist-player-select';
    playerSelect.style.flex = '1';
    playerSelect.required = true;
    playerSelect.innerHTML = '<option value="">선수 선택</option>';
    allPlayers.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = `${player.name} (${player.teamName || '무소속'})`;
        if (player.id === selectedPlayerId) option.selected = true;
        playerSelect.appendChild(option);
    });

    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'event-time-input';
    timeInput.placeholder = "시간 (예: 후반 05:00)";
    timeInput.value = timestamp;
    timeInput.style.width = '120px';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '삭제';
    removeBtn.className = 'btn-small btn-danger';
    removeBtn.onclick = () => assistDiv.remove();

    assistDiv.appendChild(playerSelect);
    assistDiv.appendChild(timeInput);
    assistDiv.appendChild(removeBtn);
    assistsContainer.appendChild(assistDiv);
}

function addCardRow(selectedPlayerId = '', cardType = 'yellow', timestamp = '') {
    const cardsContainer = document.getElementById('cards-management-section');
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-row';
    cardDiv.style.display = 'flex';
    cardDiv.style.gap = '1rem';
    cardDiv.style.marginBottom = '0.5rem';
    cardDiv.style.alignItems = 'center';

    const playerSelect = document.createElement('select');
    playerSelect.className = 'card-player-select';
    playerSelect.style.flex = '1';
    playerSelect.required = true;
    playerSelect.innerHTML = '<option value="">선수 선택</option>';
    allPlayers.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = `${player.name} (${player.teamName || '무소속'})`;
        if (player.id === selectedPlayerId) option.selected = true;
        playerSelect.appendChild(option);
    });

    const cardTypeSelect = document.createElement('select');
    cardTypeSelect.className = 'card-type-select';
    cardTypeSelect.innerHTML = `
        <option value="yellow" ${cardType === 'yellow' ? 'selected' : ''}>경고</option>
        <option value="red" ${cardType === 'red' ? 'selected' : ''}>퇴장</option>
    `;

    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'event-time-input';
    timeInput.placeholder = "시간 (예: 전반 20:15)";
    timeInput.value = timestamp;
    timeInput.style.width = '120px';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '삭제';
    removeBtn.className = 'btn-small btn-danger';
    removeBtn.onclick = () => cardDiv.remove();

    cardDiv.appendChild(playerSelect);
    cardDiv.appendChild(cardTypeSelect);
    cardDiv.appendChild(timeInput);
    cardDiv.appendChild(removeBtn);
    cardsContainer.appendChild(cardDiv);
}

async function deleteMatch(matchId) {
    const confirmed = await showCustomConfirm('정말로 이 경기를 삭제하시겠습니까? 팀의 통계가 복구됩니다.');
    if (!confirmed) return;

    try {
        await runTransaction(db, async (transaction) => {
            const matchRef = doc(db, 'matches', matchId);
            const matchDoc = await transaction.get(matchRef);

            if (!matchDoc.exists()) {
                throw new Error("삭제할 경기를 찾을 수 없습니다.");
            }

            const match = matchDoc.data();
            const homeTeamRef = doc(db, 'teams', match.homeTeamId);
            const awayTeamRef = doc(db, 'teams', match.awayTeamId);

            const homeTeamDoc = await transaction.get(homeTeamRef);
            const awayTeamDoc = await transaction.get(awayTeamRef);

            if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
                transaction.delete(matchRef);
                return;
            }
            
            const homeData = homeTeamDoc.data();
            const awayData = awayTeamDoc.data();

            const homeUpdate = {
                matchesPlayed: (homeData.matchesPlayed || 0) - 1,
                goalsFor: (homeData.goalsFor || 0) - match.homeScore,
                goalsAgainst: (homeData.goalsAgainst || 0) - match.awayScore,
                points: (homeData.points || 0)
            };
            const awayUpdate = {
                matchesPlayed: (awayData.matchesPlayed || 0) - 1,
                goalsFor: (awayData.goalsFor || 0) - match.awayScore,
                goalsAgainst: (awayData.goalsAgainst || 0) - match.homeScore,
                points: (awayData.points || 0)
            };

            if (match.homeScore > match.awayScore) {
                homeUpdate.wins = (homeData.wins || 0) - 1;
                homeUpdate.points -= 3;
                awayUpdate.losses = (awayData.losses || 0) - 1;
            } else if (match.awayScore > match.homeScore) {
                awayUpdate.wins = (awayData.wins || 0) - 1;
                awayUpdate.points -= 3;
                homeUpdate.losses = (homeData.losses || 0) - 1;
            } else {
                homeUpdate.draws = (homeData.draws || 0) - 1;
                homeUpdate.points -= 1;
                awayUpdate.draws = (awayData.draws || 0) - 1;
                awayUpdate.points -= 1;
            }

            // Ensure points do not go below zero
            if (homeUpdate.points < 0) homeUpdate.points = 0;
            if (awayUpdate.points < 0) awayUpdate.points = 0;

            homeUpdate.goalDifference = homeUpdate.goalsFor - homeUpdate.goalsAgainst;
            awayUpdate.goalDifference = awayUpdate.goalsFor - awayUpdate.goalsAgainst;

            transaction.update(homeTeamRef, homeUpdate);
            transaction.update(awayTeamRef, awayUpdate);
            transaction.delete(matchRef);
        });

        showCustomAlert('경기가 성공적으로 삭제되었습니다.');

    } catch (error) {
        console.error("Error deleting match: ", error);
        showCustomAlert(`경기 삭제 실패: ${error.message}`);
    }
}

async function saveMatchChanges(e) {
    e.preventDefault();
    const matchId = document.getElementById('editMatchId').value;
    
    const updatedData = {
        date: document.getElementById('editMatchDate').value,
        homeScore: parseInt(document.getElementById('editHomeScore').value, 10),
        awayScore: parseInt(document.getElementById('editAwayScore').value, 10),
        report_mvp: document.getElementById('editMatchMVP').value,
        report_summary: document.getElementById('editMatchSummary').value,
    };

    const newScorers = [];
    document.querySelectorAll('#scorers-management-section .scorer-row').forEach(row => {
        const playerId = row.querySelector('.scorer-player-select').value;
        const goals = parseInt(row.querySelector('.scorer-goals-input').value, 10);
        const timestamp = row.querySelector('.event-time-input').value;
        if (playerId && !isNaN(goals) && goals > 0) {
            const player = allPlayers.find(p => p.id === playerId);
            if(player) newScorers.push({ playerId, playerName: player.name, teamId: player.teamId, photoURL: player.photoURL || null, goals, timestamp });
        }
    });
    updatedData.scorers = newScorers;

    const newAssists = [];
    document.querySelectorAll('#assists-management-section .assist-row').forEach(row => {
        const playerId = row.querySelector('.assist-player-select').value;
        const timestamp = row.querySelector('.event-time-input').value;
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if(player) newAssists.push({ playerId, playerName: player.name, teamId: player.teamId, photoURL: player.photoURL || null, timestamp });
        }
    });
    updatedData.assists = newAssists;

    const newCards = [];
    document.querySelectorAll('#cards-management-section .card-row').forEach(row => {
        const playerId = row.querySelector('.card-player-select').value;
        const cardType = row.querySelector('.card-type-select').value;
        const timestamp = row.querySelector('.event-time-input').value;
        if (playerId) {
            const player = allPlayers.find(p => p.id === playerId);
            if(player) newCards.push({ playerId, playerName: player.name, teamId: player.teamId, photoURL: player.photoURL || null, cardType, timestamp });
        }
    });
    updatedData.cards = newCards;

    try {
        await updateDoc(doc(db, 'matches', matchId), updatedData);
        showCustomAlert('경기 정보가 업데이트되었습니다.');
        document.getElementById('adminMatchEditModal').style.display = 'none';
    } catch (error) {
        console.error("Error updating match:", error);
        showCustomAlert(`업데이트 중 오류가 발생했습니다: ${error.message}`);
    }
}

async function applyMatchResult() {
    const homeTeamId = document.getElementById('home-team-select').value;
    const awayTeamId = document.getElementById('away-team-select').value;
    const homeScoreStr = document.getElementById('home-score').value;
    const awayScoreStr = document.getElementById('away-score').value;
    const matchDate = document.getElementById('match-date').value;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || homeScoreStr === '' || awayScoreStr === '' || !matchDate) {
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

            homeUpdate.goalDifference = homeUpdate.goalsFor - homeUpdate.goalsAgainst;
            awayUpdate.goalDifference = awayUpdate.goalsFor - awayUpdate.goalsAgainst;

            transaction.update(homeTeamRef, homeUpdate);
            transaction.update(awayTeamRef, awayUpdate);
        });

        const homeTeamName = document.getElementById('home-team-select').options[document.getElementById('home-team-select').selectedIndex].text;
        const awayTeamName = document.getElementById('away-team-select').options[document.getElementById('away-team-select').selectedIndex].text;

        await addDoc(collection(db, 'matches'), {
            date: matchDate,
            homeTeamId: homeTeamId,
            homeTeamName: homeTeamName,
            homeScore: homeScore,
            awayTeamId: awayTeamId,
            awayTeamName: awayTeamName,
            awayScore: awayScore,
            status: 'completed',
            scorers: [],
            assists: [],
            cards: [],
            createdAt: new Date()
        });

        showCustomAlert('경기 결과가 성공적으로 반영되었습니다.');
        document.getElementById('match-management-form').reset();

    } catch (error) {
        console.error("Error applying match result: ", error);
        showCustomAlert(`경기 결과 반영 실패: ${error.message}`);
    } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = '결과 반영';
    }
}

async function scheduleNewMatch(e) {
    e.preventDefault();
    const homeTeamId = document.getElementById('schedule-home-team-select').value;
    const awayTeamId = document.getElementById('schedule-away-team-select').value;
    const matchDate = document.getElementById('schedule-match-date').value;

    if (!homeTeamId || !awayTeamId || !matchDate) {
        showCustomAlert('모든 필드를 채워주세요.');
        return;
    }

    if (homeTeamId === awayTeamId) {
        showCustomAlert('홈 팀과 원정 팀은 같을 수 없습니다.');
        return;
    }

    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';

    try {
        const homeTeamName = document.getElementById('schedule-home-team-select').options[document.getElementById('schedule-home-team-select').selectedIndex].text;
        const awayTeamName = document.getElementById('schedule-away-team-select').options[document.getElementById('schedule-away-team-select').selectedIndex].text;

        await addDoc(collection(db, 'matches'), {
            date: matchDate.replace('T', ' '),
            homeTeamId: homeTeamId,
            homeTeamName: homeTeamName,
            awayTeamId: awayTeamId,
            awayTeamName: awayTeamName,
            homeScore: null,
            awayScore: null,
            status: 'scheduled',
            scorers: [],
            assists: [],
            cards: [],
            createdAt: new Date()
        });

        showCustomAlert('경기가 성공적으로 등록되었습니다.');
        form.reset();

    } catch (error) {
        console.error("Error scheduling match: ", error);
        showCustomAlert(`일정 등록 실패: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '일정 등록';
    }
}

// --- Event Listeners ---
function setupAdminEventListeners() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    adminContent.addEventListener('click', e => {
        const target = e.target;
        if (target.matches('.edit-btn')) {
            openAdminEditModal(target.dataset.id, target.dataset.type);
        }
        if (target.matches('.delete-btn')) {
            deleteRegisteredItem(target.dataset.id, target.dataset.type);
        }
        if (target.matches('.edit-match-btn')) {
            openMatchEditModal(target.dataset.id);
        }
        if (target.matches('.delete-match-btn')) {
            deleteMatch(target.dataset.id);
        }
    });

    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    document.getElementById('adminEditPlayerForm')?.addEventListener('submit', savePlayerChanges);
    document.getElementById('adminEditTeamForm')?.addEventListener('submit', saveTeamChanges);
    document.getElementById('adminEditMatchForm')?.addEventListener('submit', saveMatchChanges);
    document.getElementById('apply-result-btn')?.addEventListener('click', applyMatchResult);
    document.getElementById('add-scorer-btn')?.addEventListener('click', () => addScorerRow());
    document.getElementById('add-assist-btn')?.addEventListener('click', () => addAssistRow());
    document.getElementById('add-card-btn')?.addEventListener('click', () => addCardRow());
    document.getElementById('schedule-match-form')?.addEventListener('submit', scheduleNewMatch);
}

// --- Page Initializer ---
export function initAdminPage() {
    const password = prompt("관리자 비밀번호를 입력하세요:");
    if (password === "wjstksqhdks") { 
        const adminContent = document.getElementById('admin-content');
        if(adminContent) adminContent.style.display = 'block';
        
        loadAllPlayers().then(() => {
            loadPendingItems('pendingPlayers', 'pending-players', '선수');
            loadPendingItems('pendingTeams', 'pending-teams', '팀');
            loadTeamsForMatchManagement();
            loadRegisteredItems('players', 'registered-players-list', '선수');
            loadRegisteredItems('teams', 'registered-teams-list', '팀');
            loadMatches();
            setupAdminEventListeners();
        });
    } else {
        showCustomAlert("비밀번호가 틀렸습니다.");
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
}