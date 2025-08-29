import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

let allPlayers = [];
let currentPage = 1;
const playersPerPage = 9;

async function fetchData() {
    if (allPlayers.length > 0) return; // 데이터가 이미 있으면 다시 가져오지 않음
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

    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    const playersToShow = allPlayers.slice(startIndex, endIndex);

    playersToShow.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'management-card fade-in-card';
        card.style.animationDelay = `${index * 50}ms`;
        card.dataset.playerId = player.id;

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

        card.addEventListener('click', () => {
            window.location.href = `player_detail.html?id=${player.id}`;
        });
    });

    renderPagination();
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(allPlayers.length / playersPerPage);
    if (totalPages <= 1) return;

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&lt;';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPlayers();
        }
    });
    paginationContainer.appendChild(prevButton);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        pageButton.className = currentPage === i ? 'active' : '';
        pageButton.addEventListener('click', () => {
            currentPage = i;
            renderPlayers();
        });
        paginationContainer.appendChild(pageButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&gt;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPlayers();
        }
    });
    paginationContainer.appendChild(nextButton);
}

export async function initAllPlayersSection() {
    await fetchData();
    renderPlayers();
}
