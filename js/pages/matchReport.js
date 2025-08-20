import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";

function initTabs() {
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
            section.classList.toggle('active', section.id === targetId);
        });
    });
}

async function renderReport(matchId) {
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
        document.querySelector('.container').innerHTML = '<h2>리포트를 찾을 수 없습니다.</h2>';
        return;
    }

    const match = matchSnap.data();

    // Render Header
    const headerEl = document.getElementById('report-header');
    if (headerEl) {
        headerEl.innerHTML = `
            <div class="match-card" style="margin-bottom: 2rem;">
                 <div class="match-date">${match.date}</div>
                 <div class="match-teams">
                     <div class="team-display">
                         <div class="team-name">${match.homeTeamName}</div>
                     </div>
                     <div class="score">${match.homeScore} : ${match.awayScore}</div>
                     <div class="team-display">
                         <div class="team-name">${match.awayTeamName}</div>
                     </div>
                 </div>
             </div>
        `;
    }

    // Render Summary Tab
    const summaryText = document.getElementById('report-summary-text');
    if (summaryText) summaryText.textContent = match.report_summary || '작성된 요약이 없습니다.';

    // Render Scorers Tab
    const scorersList = document.getElementById('report-scorers-list');
    if (scorersList) {
        scorersList.innerHTML = '';
        if (match.scorers && match.scorers.length > 0) {
            match.scorers.forEach(s => {
                const item = document.createElement('div');
                item.className = 'player-stat-item';
                item.innerHTML = `
                    <div class="player-info">
                        <img src="${s.photoURL || 'logo.png'}" alt="${s.playerName}" class="player-stat-photo">
                        <span class="player-stat-name">${s.playerName}</span>
                    </div>
                    <div class="player-stat-value-group">
                        <span class="event-timestamp">${s.timestamp || ''}</span>
                        <span class="player-stat-value">${s.goals}골</span>
                    </div>
                `;
                scorersList.appendChild(item);
            });
        } else {
            scorersList.innerHTML = '<p class="no-data">득점 기록이 없습니다.</p>';
        }
    }

    // Render Assists Tab
    const assistsList = document.getElementById('report-assists-list');
    if (assistsList) {
        assistsList.innerHTML = '';
        if (match.assists && match.assists.length > 0) {
            match.assists.forEach(a => {
                const item = document.createElement('div');
                item.className = 'player-stat-item';
                item.innerHTML = `
                    <div class="player-info">
                        <img src="${a.photoURL || 'logo.png'}" alt="${a.playerName}" class="player-stat-photo">
                        <span class="player-stat-name">${a.playerName}</span>
                    </div>
                    <div class="player-stat-value-group">
                        <span class="event-timestamp">${a.timestamp || ''}</span>
                        <span class="player-stat-value">1도움</span>
                    </div>
                `;
                assistsList.appendChild(item);
            });
        } else {
            assistsList.innerHTML = '<p class="no-data">도움 기록이 없습니다.</p>';
        }
    }

    // Render Cards Tab
    const cardsList = document.getElementById('report-cards-list');
    if (cardsList) {
        cardsList.innerHTML = '';
        if (match.cards && match.cards.length > 0) {
            match.cards.forEach(c => {
                const item = document.createElement('div');
                item.className = 'player-stat-item';
                item.innerHTML = `
                    <div class="player-info">
                        <img src="${c.photoURL || 'logo.png'}" alt="${c.playerName}" class="player-stat-photo">
                        <span class="player-stat-name">${c.playerName}</span>
                    </div>
                    <div class="player-stat-value-group">
                        <span class="event-timestamp">${c.timestamp || ''}</span>
                        <div class="card-indicator ${c.cardType}"></div>
                    </div>
                `;
                cardsList.appendChild(item);
            });
        } else {
            cardsList.innerHTML = '<p class="no-data">경고/퇴장 기록이 없습니다.</p>';
        }
    }

    // Render MVP Tab
    const mvpCard = document.getElementById('report-mvp-card');
    if (mvpCard && match.report_mvp) {
        const playerRef = doc(db, "players", match.report_mvp);
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
            const player = playerSnap.data();
            mvpCard.innerHTML = `
                <div class="mvp-card">
                    ${player.photoURL ? `<img src="${player.photoURL}" alt="${player.name}" class="mvp-photo">` : '<div class="mvp-photo placeholder-icon"></div>'}
                    <h4 class="mvp-name">${player.name}</h4>
                    <p class="mvp-team">${player.teamName}</p>
                </div>
            `;
        }
    } else if (mvpCard) {
        mvpCard.innerHTML = '<p class="no-data">MVP가 선정되지 않았습니다.</p>';
    }
}

export function initMatchReportPage() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id');

    if (!matchId) {
        document.querySelector('.container').innerHTML = '<h2>잘못된 접근입니다.</h2>';
        return;
    }

    initTabs();
    renderReport(matchId);
}