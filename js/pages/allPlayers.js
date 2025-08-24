import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

let allPlayers = [];

async function fetchData() {
    try {
        const playersQuery = getDocs(collection(db, "players"));
        const teamsQuery = getDocs(collection(db, "teams"));

        const [playersSnapshot, teamsSnapshot] = await Promise.all([
            playersQuery,
            teamsQuery,
        ]);

        const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        allPlayers = players.map(player => {
            const team = teams.find(t => t.id === player.teamId);
            return { ...player, teamName: team ? team.name : '무소속' };
        });

    } catch (error) {
        console.error("Error fetching data: ", error);
        showCustomAlert("선수 정보를 불러오는 중 오류가 발생했습니다.");
    }
}

function renderPlayers() {
    const playerListContainer = document.getElementById('all-players-list');
    if (!playerListContainer) return;
    playerListContainer.innerHTML = '';

    if (allPlayers.length === 0) {
        playerListContainer.innerHTML = '<p class="no-data">등록된 선수가 없습니다.</p>';
        return;
    }

    allPlayers.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'management-card fade-in-card';
        card.style.animationDelay = `${index * 50}ms`;
        card.dataset.playerId = player.id; // Add player ID to data attribute

        const teamInfoHtml = player.teamId
            ? `<span class="player-team-tag">${player.teamName}</span>`
            : '<span class="player-team-tag">무소속</span>';

        const photoHtml = player.photoURL
            ? `<img src="${player.photoURL}" alt="${player.name}" class="recruit-player-photo">`
            : `<img src="logo.png" alt="${player.name}" class="recruit-player-photo">`;

        card.innerHTML = `
            <div class="card-header">
                <div class="player-info-recruit">
                    ${photoHtml}
                    <h3>${player.name}</h3>
                </div>
                ${teamInfoHtml}
            </div>
            <p class="player-profile-desc">${player.profile || '소개가 없습니다.'}</p>
        `;
        playerListContainer.appendChild(card);

        // Add click event listener to the card
        card.addEventListener('click', () => {
            window.location.href = `player_detail.html?id=${player.id}`;
        });
    });
}

export async function initAllPlayersSection() {
    await fetchData();
    renderPlayers();
}
