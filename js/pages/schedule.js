import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";

let teamsData = new Map();

async function loadAllTeams() {
    try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        querySnapshot.forEach(doc => {
            teamsData.set(doc.id, doc.data());
        });
    } catch (error) {
        console.error("Error loading all teams:", error);
    }
}

async function displayScheduledMatches() {
    const scheduleList = document.getElementById('schedule-list');
    if (!scheduleList) return;

    try {
        const q = query(
            collection(db, "matches"),
            where("status", "==", "scheduled"),
            orderBy("date", "asc")
        );
        const querySnapshot = await getDocs(q);

        scheduleList.innerHTML = ''; // Clear previous content

        if (querySnapshot.empty) {
            scheduleList.innerHTML = '<p style="text-align: center; padding: 2rem;">예정된 경기가 없습니다.</p>';
            return;
        }

        querySnapshot.forEach(docSnapshot => {
            const match = docSnapshot.data();
            const homeTeam = teamsData.get(match.homeTeamId);
            const awayTeam = teamsData.get(match.awayTeamId);

            const homeTeamIcon = homeTeam?.iconUrl || 'logo.png';
            const awayTeamIcon = awayTeam?.iconUrl || 'logo.png';

            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-teams">
                    <div class="team-display">
                        <img src="${homeTeamIcon}" alt="${match.homeTeamName}" class="team-icon">
                        <span>${match.homeTeamName}</span>
                    </div>
                    <span class="vs-divider">VS</span>
                    <div class="team-display">
                        <img src="${awayTeamIcon}" alt="${match.awayTeamName}" class="team-icon">
                        <span>${match.awayTeamName}</span>
                    </div>
                </div>
                <div class="match-datetime">
                    <div class="date">${match.date.split(' ')[0]}</div>
                    <div class="time">${match.date.split(' ')[1]}</div>
                </div>
            `;
            scheduleList.appendChild(matchCard);
        });

    } catch (error) {
        console.error("Error fetching scheduled matches:", error);
        scheduleList.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">경기 일정을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

export async function initSchedulePage() {
    await loadAllTeams();
    displayScheduledMatches();
}
