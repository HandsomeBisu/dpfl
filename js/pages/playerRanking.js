import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";

async function fetchAllPlayers() {
    const players = {};
    const playersSnapshot = await getDocs(collection(db, "players"));
    playersSnapshot.forEach(doc => {
        players[doc.id] = doc.data();
    });
    return players;
}

async function fetchAllTeams() {
    const teams = new Map();
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    teamsSnapshot.forEach(doc => {
        teams.set(doc.id, doc.data());
    });
    return teams;
}

function renderRankingTable(tbodyId, rankedData, statKey, teamsMap) {
    const rankingBody = document.getElementById(tbodyId);
    if (!rankingBody) return;

    rankingBody.innerHTML = ''; // Clear loading message

    if (rankedData.length === 0) {
        rankingBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">기록이 없습니다.</td></tr>`;
        return;
    }

    let rank = 1;
    rankedData.forEach((player, index) => {
        // Handle ties in rank
        if (index > 0 && player[statKey] < rankedData[index - 1][statKey]) {
            rank = index + 1;
        }


        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rank}</td>
            <td class="player-cell">
                ${player.name || '알 수 없음'}
            </td>
            <td class="team-cell">
                ${player.teamName || '무소속'}
            </td>
            <td>${player[statKey]}</td>
        `;
        rankingBody.appendChild(row);
    });
}

export async function initPlayerRankingPage() {
    const goalRankingBody = document.getElementById('player-ranking-body');
    const assistRankingBody = document.getElementById('assist-ranking-body');

    if (goalRankingBody) goalRankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">순위를 불러오는 중...</td></tr>';
    if (assistRankingBody) assistRankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">순위를 불러오는 중...</td></tr>';

    try {
        const [allPlayers, allTeams] = await Promise.all([fetchAllPlayers(), fetchAllTeams()]);
        
        const goalStats = {};
        const assistStats = {};

        const matchesSnapshot = await getDocs(collection(db, "matches"));
        
        matchesSnapshot.forEach(matchDoc => {
            const matchData = matchDoc.data();
            if (matchData.matchType === 'practice') return; // Skip practice matches

            if (matchData.events && Array.isArray(matchData.events)) {
                matchData.events.forEach(event => {
                    if (!allPlayers[event.playerId]) return; // Skip if player data is missing
                    if (event.type === 'goal') {
                        if (!goalStats[event.playerId]) {
                            goalStats[event.playerId] = { goals: 0, ...allPlayers[event.playerId] };
                        }
                        goalStats[event.playerId].goals += event.goals || 1;
                    } else if (event.type === 'assist') {
                        if (!assistStats[event.playerId]) {
                            assistStats[event.playerId] = { assists: 0, ...allPlayers[event.playerId] };
                        }
                        assistStats[event.playerId].assists += 1;
                    }
                });
            } else {
                if (matchData.scorers && Array.isArray(matchData.scorers)) {
                    matchData.scorers.forEach(scorer => {
                        if (!allPlayers[scorer.playerId]) return;
                        if (!goalStats[scorer.playerId]) {
                            goalStats[scorer.playerId] = { goals: 0, ...allPlayers[scorer.playerId] };
                        }
                        goalStats[scorer.playerId].goals += scorer.goals;
                    });
                }
                if (matchData.assists && Array.isArray(matchData.assists)) {
                    matchData.assists.forEach(assist => {
                        if (!allPlayers[assist.playerId]) return;
                        if (!assistStats[assist.playerId]) {
                            assistStats[assist.playerId] = { assists: 0, ...allPlayers[assist.playerId] };
                        }
                        assistStats[assist.playerId].assists += 1;
                    });
                }
            }
        });

        const rankedScorers = Object.values(goalStats).sort((a, b) => b.goals - a.goals);
        const rankedAssisters = Object.values(assistStats).sort((a, b) => b.assists - a.assists);

        renderRankingTable('player-ranking-body', rankedScorers, 'goals', allTeams);
        renderRankingTable('assist-ranking-body', rankedAssisters, 'assists', allTeams);

    } catch (error) {
        console.error("Error loading player rankings: ", error);
        if (goalRankingBody) goalRankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">득점 순위를 불러오는 데 실패했습니다.</td></tr>';
        if (assistRankingBody) assistRankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">도움 순위를 불러오는 데 실패했습니다.</td></tr>';
    }
}
