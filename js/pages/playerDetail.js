import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import { db } from '../firebase/config.js';

async function fetchPlayerData(playerId) {
    const playerRef = doc(db, 'players', playerId);
    const playerSnap = await getDoc(playerRef);

    if (!playerSnap.exists()) {
        console.error('No such player!');
        return null;
    }

    const playerData = playerSnap.data();
    playerData.id = playerSnap.id;

    if (playerData.teamId) {
        const teamRef = doc(db, 'teams', playerData.teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
            playerData.teamName = teamSnap.data().name;
        } else {
            playerData.teamName = '알 수 없는 팀';
        }
    }

    return playerData;
}

async function calculatePlayerStats(playerId) {
    const stats = {
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
    };

    const matchesSnapshot = await getDocs(collection(db, "matches"));

    matchesSnapshot.forEach(matchDoc => {
        const matchData = matchDoc.data();
        
        // Calculate goals
        if (matchData.scorers && Array.isArray(matchData.scorers)) {
            matchData.scorers.forEach(scorer => {
                if (scorer.playerId === playerId) {
                    stats.goals += Number(scorer.goals) || 0;
                }
            });
        }

        // Calculate assists
        if (matchData.assists && Array.isArray(matchData.assists)) {
            matchData.assists.forEach(assist => {
                if (assist.playerId === playerId) {
                    stats.assists += 1;
                }
            });
        }

        // Calculate cards
        if (matchData.cards && Array.isArray(matchData.cards)) {
            matchData.cards.forEach(card => {
                if (card.playerId === playerId) {
                    if (card.cardType === 'yellow') {
                        stats.yellowCards += 1;
                    } else if (card.cardType === 'red') {
                        stats.redCards += 1;
                    }
                }
            });
        }
    });

    return stats;
}

function renderPlayerHeader(player) {
    const header = document.getElementById('player-header');
    if (!header) return;

    const photoUrl = player.photoURL || 'logo.png';
    const teamName = player.teamName || '소속 팀 없음';
    const teamLink = player.teamId ? `<a href="team_detail.html?id=${player.teamId}">${teamName}</a>` : teamName;

    header.innerHTML = `
        <img src="${photoUrl}" alt="${player.name}" class="player-photo">
        <h1>${player.name}</h1>
        <p class="player-team-name">${teamLink}</p>
    `;
}

function renderPlayerInfo(player) {
    const infoList = document.getElementById('player-info-list');
    if (!infoList) return;

    infoList.innerHTML = `
        <li><strong>이름</strong><span>${player.name}</span></li>
        <li><strong>소속팀</strong><span>${player.teamName || '무소속'}</span></li>
    `;
}

function renderPlayerStatsLoading() {
    const statsList = document.getElementById('player-stats-list');
    if (!statsList) return;
    statsList.innerHTML = `<li>기록을 불러오는 중...</li>`;
}

function renderPlayerStats(stats) {
    const statsList = document.getElementById('player-stats-list');
    if (!statsList) return;

    if (!stats) {
        statsList.innerHTML = `<li>기록을 불러오는 데 실패했습니다.</li>`;
        return;
    }

    statsList.innerHTML = `
        <li><strong>득점</strong><span>${stats.goals}</span></li>
        <li><strong>도움</strong><span>${stats.assists}</span></li>
        <li><strong>경고</strong><span>${stats.yellowCards}</span></li>
        <li><strong>퇴장</strong><span>${stats.redCards}</span></li>
    `;
}

function displayPlayerNotFound() {
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = '<div class="container"><p style="text-align:center; padding: 3rem 0;">해당 선수를 찾을 수 없습니다.</p></div>';
}

export async function initPlayerDetailPage() {
    try {
        const params = new URLSearchParams(window.location.search);
        const playerId = params.get('id');

        if (!playerId) {
            displayPlayerNotFound();
            return;
        }

        const playerData = await fetchPlayerData(playerId);

        if (playerData) {
            // Render basic info immediately
            renderPlayerHeader(playerData);
            renderPlayerInfo(playerData);
            
            // Show loading state for stats
            renderPlayerStatsLoading();

            // Calculate and render stats asynchronously
            try {
                const playerStats = await calculatePlayerStats(playerId);
                renderPlayerStats(playerStats);
            } catch (error) {
                console.error("Error calculating player stats:", error);
                renderPlayerStats(null); // Render an error state
            }

        } else {
            displayPlayerNotFound();
        }
    } catch (error) {
        console.error("Failed to initialize player detail page:", error);
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = '<div class="container"><p style="text-align:center; padding: 3rem 0;">페이지를 불러오는 중 오류가 발생했습니다.</p></div>';
        }
    }
}
