import { collection, getDocs, doc, addDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert, showCustomConfirm } from "../ui/alerts.js";

let allPlayers = [];
let currentTeamId = null;
let currentTeamName = null;
let pendingPlayerIds = [];

function getTeamIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('teamId');
}

async function fetchData() {
    try {
        const teamRef = doc(db, "teams", currentTeamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
            throw new Error("Team not found");
        }
        currentTeamName = teamSnap.data().name;

        const playersQuery = getDocs(collection(db, "players"));
        const teamsQuery = getDocs(collection(db, "teams"));
        const requestsQuery = getDocs(query(collection(db, "recruitmentRequests"), where("teamId", "==", currentTeamId), where("status", "==", "pending")));

        const [playersSnapshot, teamsSnapshot, requestsSnapshot] = await Promise.all([
            playersQuery,
            teamsQuery,
            requestsQuery
        ]);

        const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        pendingPlayerIds = requestsSnapshot.docs.map(doc => doc.data().playerId);

        allPlayers = players.map(player => {
            const team = teams.find(t => t.id === player.teamId);
            return { ...player, teamName: team ? team.name : '무소속' };
        });

    } catch (error) {
        console.error("Error fetching data: ", error);
        showCustomAlert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function renderPlayers(category) {
    const playerListContainer = document.getElementById('player-recruit-list');
    if (!playerListContainer) return;
    playerListContainer.innerHTML = '';

    let filteredPlayers;
    if (category === 'available') {
        filteredPlayers = allPlayers.filter(p => !p.teamId);
    } else if (category === 'unavailable') {
        filteredPlayers = allPlayers.filter(p => p.teamId);
    } else {
        filteredPlayers = allPlayers;
    }

    if (filteredPlayers.length === 0) {
        playerListContainer.innerHTML = '<p class="no-data">해당하는 선수가 없습니다.</p>';
        return;
    }

    filteredPlayers.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'management-card fade-in-card';
        card.style.animationDelay = `${index * 50}ms`;

        const isPending = pendingPlayerIds.includes(player.id);
        let buttonHtml = '';
        if (!player.teamId) {
            buttonHtml = `<button class="btn btn-recruit" data-player-id="${player.id}" data-player-name="${player.name}" ${isPending ? 'disabled' : ''}>${isPending ? '제안 보냄' : '영입 제안'}</button>`;
        } else {
            buttonHtml = `<span class="player-team-tag">${player.teamName}</span>`;
        }

        const photoHtml = player.photoURL
            ? `<img src="${player.photoURL}" alt="${player.name}" class="recruit-player-photo">`
            : `<div class="recruit-player-photo-placeholder"></div>`;

        card.innerHTML = `
            <div class="card-header">
                <div class="player-info-recruit">
                    ${photoHtml}
                    <h3>${player.name}</h3>
                </div>
                ${buttonHtml}
            </div>
            <p class="player-profile-desc">${player.profile || '소개가 없습니다.'}</p>
        `;
        playerListContainer.appendChild(card);
    });

    document.querySelectorAll('.btn-recruit').forEach(button => {
        button.addEventListener('click', handleRecruitPlayer);
    });
}

async function handleRecruitPlayer(event) {
    const playerId = event.target.dataset.playerId;
    const playerName = event.target.dataset.playerName;

    const confirmed = await showCustomConfirm(`'${playerName}' 선수에게 영입 제안을 보내시겠습니까?`);

    if (confirmed) {
        try {
            await addDoc(collection(db, "recruitmentRequests"), {
                teamId: currentTeamId,
                teamName: currentTeamName,
                playerId: playerId,
                status: 'pending',
                createdAt: new Date()
            });

            showCustomAlert("선수에게 영입 제안을 보냈습니다.");

            // Refresh list after confirmation
            await fetchData();
            const activeTab = document.querySelector('.tab-btn.active').dataset.category;
            renderPlayers(activeTab);

        } catch (error) {
            console.error("Error sending recruitment request:", error);
            showCustomAlert("영입 제안을 보내는 중 오류가 발생했습니다.");
        }
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderPlayers(tab.dataset.category);
        });
    });
}

export async function initRecruitPlayerPage(user) {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    currentTeamId = getTeamIdFromUrl();
    if (!currentTeamId) {
        showCustomAlert("잘못된 접근입니다. 팀 관리 페이지로 돌아갑니다.");
        window.location.href = 'manage_team.html';
        return;
    }

    await fetchData();
    setupTabs();
    renderPlayers('all');
}