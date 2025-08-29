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

function renderRankingTable(tbodyId, rankedData, statKey) {
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
            <td>${player.name || '알 수 없음'}</td>
            <td>${player.teamName || '무소속'}</td>
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
        const allPlayers = await fetchAllPlayers();
        const goalStats = {};
        const assistStats = {};

        const matchesSnapshot = await getDocs(collection(db, "matches"));
        
        matchesSnapshot.forEach(matchDoc => {
            const matchData = matchDoc.data();
            if (matchData.matchType === 'practice') return; // 연습 경기는 건너뛰기

            // Aggregate goals
            if (matchData.scorers && Array.isArray(matchData.scorers)) {
                matchData.scorers.forEach(scorer => {
                    if (!goalStats[scorer.playerId]) {
                        goalStats[scorer.playerId] = { 
                            goals: 0,
                            ...allPlayers[scorer.playerId]
                        };
                    }
                    goalStats[scorer.playerId].goals += scorer.goals;
                });
            }

            // Aggregate assists
            if (matchData.assists && Array.isArray(matchData.assists)) {
                matchData.assists.forEach(assist => {
                    if (!assistStats[assist.playerId]) {
                        assistStats[assist.playerId] = { 
                            assists: 0,
                            ...allPlayers[assist.playerId]
                        };
                    }
                    assistStats[assist.playerId].assists += 1; // Each entry is one assist
                });
            }
        });

        const rankedScorers = Object.values(goalStats).sort((a, b) => b.goals - a.goals);
        const rankedAssisters = Object.values(assistStats).sort((a, b) => b.assists - a.assists);

        renderRankingTable('player-ranking-body', rankedScorers, 'goals');
        renderRankingTable('assist-ranking-body', rankedAssisters, 'assists');

    } catch (error) {
        console.error("Error loading player rankings: ", error);
        if (goalRankingBody) goalRankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">득점 순위를 불러오는 데 실패했습니다.</td></tr>';
        if (assistRankingBody) assistRankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">도움 순위를 불러오는 데 실패했습니다.</td></tr>';
    }
}