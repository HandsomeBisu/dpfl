import { collection, query, getDocs, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { initAllPlayersSection } from "./allPlayers.js"; // New import
import { getPopupData } from "../main.js";

// --- Data Loading & Caching ---
let teamsData = new Map();
let allPlayers = {};

async function loadAllTeams() {
    if (teamsData.size > 0) return;
    try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        querySnapshot.forEach(doc => {
            teamsData.set(doc.id, doc.data());
        });
    } catch (error) {
        console.error("Error loading all teams:", error);
    }
}

async function loadAllPlayers() {
    if (Object.keys(allPlayers).length > 0) return;
    try {
        const playersSnapshot = await getDocs(collection(db, "players"));
        playersSnapshot.forEach(doc => {
            allPlayers[doc.id] = doc.data();
        });
    } catch (error) {
        console.error("Error loading all players:", error);
    }
}

// --- Tab Content Rendering ---

async function renderTeamRankings() {
    const rankingBody = document.getElementById('ranking-body');
    if (!rankingBody) return;
    rankingBody.innerHTML = '<tr><td colspan="11">순위를 불러오는 중...</td></tr>';

    try {
        const teamsQuery = query(collection(db, "teams"), orderBy("points", "desc"), orderBy("goalDifference", "desc"), orderBy("goalsFor", "desc"));
        const querySnapshot = await getDocs(teamsQuery);

        rankingBody.innerHTML = '';
        if (querySnapshot.empty) {
            rankingBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">등록된 팀이 없습니다.</td></tr>';
            return;
        }

        let rank = 1;
        querySnapshot.forEach(doc => {
            const team = doc.data();
            const row = document.createElement('tr');
            row.classList.add('team-row');
            row.dataset.teamId = doc.id;
            const iconUrl = team.iconUrl || 'logo.png';

            row.innerHTML = `
                <td>${rank}</td>
                <td><img src="${iconUrl}" alt="${team.name}" class="team-icon-ranking"></td>
                <td class="team-name-cell">${team.name}</td>
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

        rankingBody.addEventListener('click', (e) => {
            const row = e.target.closest('.team-row');
            if (row && row.dataset.teamId) {
                window.location.href = `team_detail.html?id=${row.dataset.teamId}`;
            }
        });
    } catch (error) {
        console.error("Error fetching team rankings:", error);
        rankingBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">순위 로딩 실패</td></tr>';
    }
}

async function renderPlayerRankings() {
    const goalRankingBody = document.getElementById('player-ranking-body');
    const assistRankingBody = document.getElementById('assist-ranking-body');
    if (!goalRankingBody || !assistRankingBody) return;

    goalRankingBody.innerHTML = '<tr><td colspan="4">득점 순위를 불러오는 중...</td></tr>';
    assistRankingBody.innerHTML = '<tr><td colspan="4">도움 순위를 불러오는 중...</td></tr>';

    try {
        const goalStats = {};
        const assistStats = {};
        const matchesSnapshot = await getDocs(collection(db, "matches"));

        matchesSnapshot.forEach(matchDoc => {
            const matchData = matchDoc.data();
            if (matchData.matchType === 'practice') return; // Skip practice matches

            if (matchData.events && Array.isArray(matchData.events)) {
                // New data structure: process events array
                matchData.events.forEach(event => {
                    if (event.type === 'goal') {
                        if (!goalStats[event.playerId]) goalStats[event.playerId] = { goals: 0 };
                        goalStats[event.playerId].goals += event.goals || 1;
                    } else if (event.type === 'assist') {
                        if (!assistStats[event.playerId]) assistStats[event.playerId] = { assists: 0 };
                        assistStats[event.playerId].assists += 1;
                    }
                });
            } else {
                // Legacy data structure: process scorers/assists arrays
                if (matchData.scorers) {
                    matchData.scorers.forEach(scorer => {
                        if (!goalStats[scorer.playerId]) goalStats[scorer.playerId] = { goals: 0 };
                        goalStats[scorer.playerId].goals += scorer.goals;
                    });
                }
                if (matchData.assists) {
                    matchData.assists.forEach(assist => {
                        if (!assistStats[assist.playerId]) assistStats[assist.playerId] = { assists: 0 };
                        assistStats[assist.playerId].assists += 1;
                    });
                }
            }
        });

        const renderTable = (tbody, stats, key) => {
            const ranked = Object.entries(stats).sort(([, a], [, b]) => b[key] - a[key]);
            tbody.innerHTML = '';
            if (ranked.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">기록이 없습니다.</td></tr>';
                return;
            }
            let rank = 1;
            ranked.forEach(([playerId, data], index) => {
                if (index > 0 && data[key] < ranked[index - 1][1][key]) rank = index + 1;
                const playerInfo = allPlayers[playerId] || { name: '알 수 없음', teamName: '-' };
                const playerPhotoUrl = playerInfo.photoURL || 'logo.png';
                const teamIconUrl = playerInfo.teamId ? teamsData.get(playerInfo.teamId)?.iconUrl || 'logo.png' : 'logo.png';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${rank}</td>
                    <td class="player-cell">
                        ${playerInfo.name}
                    </td>
                    <td class="team-cell">
                        ${playerInfo.teamName || '무소속'}
                    </td>
                    <td>${data[key]}</td>
                `;
                tbody.appendChild(row);
            });
        };

        renderTable(goalRankingBody, goalStats, 'goals');
        renderTable(assistRankingBody, assistStats, 'assists');

    } catch (error) {
        console.error("Error fetching player rankings:", error);
        goalRankingBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">득점 순위 로딩 실패</td></tr>';
        assistRankingBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">도움 순위 로딩 실패</td></tr>';
    }
}

async function renderRecentMatches() {
    const container = document.getElementById('recent-matches-container');
    if (!container) return;
    container.innerHTML = '<p>최근 경기를 불러오는 중...</p>';

    try {
        const matchesQuery = query(collection(db, "matches"), where("status", "!=", "scheduled"), orderBy("status"), orderBy("date", "desc"), limit(5));
        const querySnapshot = await getDocs(matchesQuery);

        if (querySnapshot.empty) {
            container.innerHTML = '<p class="no-data">최근 경기 결과가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';
        querySnapshot.forEach(doc => {
            const match = doc.data();
            const homeTeamIcon = teamsData.get(match.homeTeamId)?.iconUrl || 'logo.png';
            const awayTeamIcon = teamsData.get(match.awayTeamId)?.iconUrl || 'logo.png';
            const card = document.createElement('div');
            card.className = 'match-card';

            const matchTypeBadge = match.matchType === 'practice' 
                ? `<span class="practice-match-badge">연습</span>` 
                : '';

            card.innerHTML = `
                <div class="match-date">${match.date}${matchTypeBadge}</div>
                <div class="match-teams">
                    <div class="team-display">
                        <img src="${homeTeamIcon}" alt="${match.homeTeamName}" class="match-card-team-icon">
                        <div class="team-name">${match.homeTeamName}</div>
                    </div>
                    <div class="score">${match.homeScore} : ${match.awayScore}</div>
                    <div class="team-display">
                        <img src="${awayTeamIcon}" alt="${match.awayTeamName}" class="match-card-team-icon">
                        <div class="team-name">${match.awayTeamName}</div>
                    </div>
                </div>
                <a href="match_report.html?id=${doc.id}" class="btn btn-small" style="margin-top: 1rem;">리포트 보기</a>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching recent matches:", error);
        container.innerHTML = '<p class="no-data">경기 결과를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

async function renderSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;
    container.innerHTML = '<p>경기 일정을 불러오는 중...</p>';

    try {
        const today = new Date().toISOString().split('T')[0];
        const scheduleQuery = query(collection(db, "matches"), where("status", "==", "scheduled"), where("date", ">=", today), orderBy("date"), limit(10));
        const querySnapshot = await getDocs(scheduleQuery);

        if (querySnapshot.empty) {
            container.innerHTML = '<p class="no-data">예정된 경기가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';
        querySnapshot.forEach(doc => {
            const match = doc.data();
            const homeTeam = teamsData.get(match.homeTeamId);
            const awayTeam = teamsData.get(match.awayTeamId);

            const homeTeamIcon = homeTeam?.iconUrl || 'logo.png';
            const awayTeamIcon = awayTeam?.iconUrl || 'logo.png';
            const matchDate = new Date(match.date);
            const item = document.createElement('div');
            item.className = 'schedule-item';
            item.innerHTML = `
                <div class="schedule-team">
                    <img src="${homeTeamIcon}" alt="${match.homeTeamName}" class="team-icon-schedule">
                    <span>${match.homeTeamName}</span>
                </div>
                <div class="schedule-time">
                    <strong>${matchDate.toLocaleDateString('ko-KR')}</strong>
                    <span>${matchDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="schedule-team">
                    <img src="${awayTeamIcon}" alt="${match.awayTeamName}" class="team-icon-schedule">
                    <span>${match.awayTeamName}</span>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error("Error fetching schedule:", error);
        container.innerHTML = '<p class="no-data">일정을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

async function displayPopup() {
    if (sessionStorage.getItem('hasSeenPopup')) {
        return;
    }

    const popupData = await getPopupData();
    if (!popupData) return;

    const now = new Date();
    const startDate = new Date(popupData.startDate);
    const endDate = new Date(popupData.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day

    if (now >= startDate && now <= endDate) {
        const converter = new showdown.Converter();
        const htmlContent = converter.makeHtml(popupData.content);

        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'custom-alert-overlay';

        const popupContainer = document.createElement('div');
        popupContainer.className = 'custom-alert-popup';

        const popupContent = document.createElement('div');
        popupContent.innerHTML = htmlContent;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = 'close-button';
        
        const closePopup = () => {
            popupOverlay.classList.remove('active');
            popupOverlay.addEventListener('transitionend', () => {
                popupOverlay.remove();
            }, { once: true });
        };

        closeButton.onclick = closePopup;

        popupContainer.appendChild(closeButton);
        popupContainer.appendChild(popupContent);
        popupOverlay.appendChild(popupContainer);
        document.body.appendChild(popupOverlay);

        setTimeout(() => {
            popupOverlay.classList.add('active');
        }, 10);

        sessionStorage.setItem('hasSeenPopup', 'true');
    }
}

// --- Tab Initialization ---

function initContentTabs() {
    const tabsContainer = document.querySelector('.content-tabs');
    if (!tabsContainer) return;

    const contentSections = document.querySelectorAll('.content-section');
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabsContainer.addEventListener('click', (e) => {
        const clickedBtn = e.target.closest('.tab-btn');
        if (!clickedBtn) return;

        const targetId = clickedBtn.dataset.target;
        
        tabBtns.forEach(btn => btn.classList.remove('active'));
        clickedBtn.classList.add('active');

        contentSections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Call specific init function for the active tab
        if (targetId === 'all-players-content') {
            initAllPlayersSection();
        }
    });
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const tabBtn = document.querySelector(`.tab-btn[data-target="${hash}"]`);
    if (tabBtn) {
        tabBtn.click();
        const targetElement = document.getElementById(hash);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// --- Page Initializer ---

export async function initHomePage() {
    initContentTabs();
    await Promise.all([loadAllTeams(), loadAllPlayers(), displayPopup()]);
    
    // Load content for all tabs
    renderRecentMatches();
    renderTeamRankings();
    renderPlayerRankings();
    renderSchedule();
    initAllPlayersSection(); // Call for initial load

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
}
