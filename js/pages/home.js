import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";

async function displayRankings() {
    const rankingBody = document.getElementById('ranking-body');
    if (!rankingBody) return;

    try {
        // 승점, 득실, 다득점 순으로 팀 정렬
        const teamsQuery = query(collection(db, "teams"), orderBy("points", "desc"), orderBy("goalDifference", "desc"), orderBy("goalsFor", "desc"));
        const querySnapshot = await getDocs(teamsQuery);

        rankingBody.innerHTML = ''; // 기존 순위표 초기화
        if (querySnapshot.empty) {
            rankingBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">아직 등록된 팀이 없습니다.</td></tr>';
            return;
        }

        let rank = 1;
        querySnapshot.forEach(doc => {
            const team = doc.data();
            const teamId = doc.id;

            const row = document.createElement('tr');

            // 각 셀의 내용 채우기
            row.innerHTML = `
                <td>${rank}</td>
                <td><a href="team_detail.html?id=${teamId}">${team.name}</a></td>
                <td>${team.matchesPlayed || 0}</td>
                <td>${team.points || 0}</td>
                <td>${team.wins || 0}</td>
                <td>${team.draws || 0}</td>
                <td>${team.losses || 0}</td>
                <td>${team.goalsFor || 0}</td>
                <td>${team.goalsAgainst || 0}</td>
                <td>${team.goalDifference || 0}</td>
            `;

            rankingBody.appendChild(row);
            rank++;
        });
    } catch (error) {
        console.error("Error fetching team rankings:", error);
        rankingBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">순위를 불러오는 중 오류가 발생했습니다.</td></tr>';
    }
}

export function initHomePage() {
    displayRankings();
}