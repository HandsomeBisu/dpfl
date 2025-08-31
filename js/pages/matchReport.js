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

// Helper to parse timestamp for legacy data sorting
function parseLegacyTimestamp(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') return Infinity;
    let halfOffset = 0;
    let timePart = timestamp;
    if (timestamp.startsWith('전반')) {
        timePart = timestamp.replace('전반', '').trim();
    } else if (timestamp.startsWith('후반')) {
        halfOffset = 45;
        timePart = timestamp.replace('후반', '').trim();
    }
    const parts = timePart.split(':');
    if (parts.length !== 2) {
        const simpleMinutes = parseInt(timePart, 10);
        return isNaN(simpleMinutes) ? Infinity : simpleMinutes;
    }
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return Infinity;
    return halfOffset + minutes + (seconds / 60.0);
}

async function renderReport(matchId) {
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
        document.querySelector('.container').innerHTML = '<h2>리포트를 찾을 수 없습니다.</h2>';
        return;
    }

    const match = matchSnap.data();

    // Fetch team data for icons
    const homeTeamRef = doc(db, "teams", match.homeTeamId);
    const awayTeamRef = doc(db, "teams", match.awayTeamId);
    const [homeTeamSnap, awayTeamSnap] = await Promise.all([getDoc(homeTeamRef), getDoc(awayTeamRef)]);
    const homeTeamIcon = homeTeamSnap.exists() && homeTeamSnap.data().iconUrl ? homeTeamSnap.data().iconUrl : 'logo.png';
    const awayTeamIcon = awayTeamSnap.exists() && awayTeamSnap.data().iconUrl ? awayTeamSnap.data().iconUrl : 'logo.png';

    // Render Header
    const headerEl = document.getElementById('report-header');
    if (headerEl) {
        headerEl.innerHTML = `
            <div class="match-card" style="margin-bottom: 2rem;">
                 <div class="match-date">${match.date} - ${match.matchType === 'real' ? '실제 경기' : '연습 경기'}</div>
                 <div class="match-teams">
                     <div class="team-display">
                         <img src="${homeTeamIcon}" alt="${match.homeTeamName}" class="team-icon-ranking">
                         <div class="team-name">${match.homeTeamName}</div>
                     </div>
                     <div class="score">${match.homeScore} : ${match.awayScore}</div>
                     <div class="team-display">
                         <img src="${awayTeamIcon}" alt="${match.awayTeamName}" class="team-icon-ranking">
                         <div class="team-name">${match.awayTeamName}</div>
                     </div>
                 </div>
             </div>
        `;
    }

    // Display practice match notice
    const practiceNoticeEl = document.getElementById('practice-match-notice');
    if (practiceNoticeEl) {
        practiceNoticeEl.style.display = match.matchType === 'practice' ? 'block' : 'none';
    }

    // --- Event Processing ---
    let events = [];
    if (match.events && Array.isArray(match.events)) {
        // Use the new events array directly (order is preserved)
        events = match.events;
    } else {
        // Fallback for legacy data
        if (match.scorers) match.scorers.forEach(s => events.push({ type: 'goal', ...s }));
        if (match.assists) match.assists.forEach(a => events.push({ type: 'assist', ...a }));
        if (match.cards) match.cards.forEach(c => events.push({ type: 'card', ...c }));
        // Sort legacy data by timestamp to have a reasonable order
        events.sort((a, b) => parseLegacyTimestamp(a.timestamp) - parseLegacyTimestamp(b.timestamp));
    }

    // --- Tab Rendering ---

    // Render Summary Tab (all events in order)
    const eventsList = document.getElementById('report-events-list');
    if (eventsList) {
        if (events.length > 0) {
            eventsList.innerHTML = '';
            events.forEach(e => {
                const item = document.createElement('div');
                item.className = 'player-stat-item';
                let eventDetail = '';
                switch (e.type) {
                    case 'goal': eventDetail = `<span class="player-stat-value">${e.goals || 1}골</span>`; break;
                    case 'assist': eventDetail = `<span class="player-stat-value">1도움</span>`; break;
                    case 'card': eventDetail = `<div class="card-indicator ${e.cardType}"></div>`; break;
                    case 'sub_in': eventDetail = `<span class="player-stat-value sub-in">IN</span>`; break;
                    case 'sub_out': eventDetail = `<span class="player-stat-value sub-out">OUT</span>`; break;
                }
                item.innerHTML = `
                    <div class="player-info">
                        <img src="${e.photoURL || 'logo.png'}" alt="${e.playerName}" class="player-stat-photo">
                        <span class="player-stat-name">${e.playerName}</span>
                    </div>
                    <div class="player-stat-value-group">
                        <span class="event-timestamp">${e.timestamp || ''}</span>
                        ${eventDetail}
                    </div>
                `;
                eventsList.appendChild(item);
            });
        } else {
            eventsList.innerHTML = '<p class="no-data">경기 기록이 없습니다.</p>';
        }
    }
    const summaryText = document.getElementById('report-summary-text');
    if (summaryText) summaryText.textContent = match.report_summary || '작성된 관리자 코멘트가 없습니다.';

    // Render Scorers Tab
    const scorersList = document.getElementById('report-scorers-list');
    if (scorersList) {
        const goalEvents = events.filter(e => e.type === 'goal');
        if (goalEvents.length > 0) {
            scorersList.innerHTML = '';
            goalEvents.forEach(s => {
                const item = document.createElement('div');
                item.className = 'player-stat-item';
                item.innerHTML = `
                    <div class="player-info">
                        <img src="${s.photoURL || 'logo.png'}" alt="${s.playerName}" class="player-stat-photo">
                        <span class="player-stat-name">${s.playerName}</span>
                    </div>
                    <div class="player-stat-value-group">
                        <span class="event-timestamp">${s.timestamp || ''}</span>
                        <span class="player-stat-value">${s.goals || 1}골</span>
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
        const assistEvents = events.filter(e => e.type === 'assist');
        if (assistEvents.length > 0) {
            assistsList.innerHTML = '';
            assistEvents.forEach(a => {
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
        const cardEvents = events.filter(e => e.type === 'card');
        if (cardEvents.length > 0) {
            cardsList.innerHTML = '';
            cardEvents.forEach(c => {
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

    // Render Substitutions Tab
    const subsList = document.getElementById('report-subs-list');
    if (subsList) {
        const subEvents = events.filter(e => e.type === 'sub_in' || e.type === 'sub_out');
        if (subEvents.length > 0) {
            subsList.innerHTML = '';
            subEvents.forEach(s => {
                const item = document.createElement('div');
                item.className = 'player-stat-item';
                const subDetail = s.type === 'sub_in' 
                    ? `<span class="player-stat-value sub-in">IN</span>` 
                    : `<span class="player-stat-value sub-out">OUT</span>`;

                item.innerHTML = `
                    <div class="player-info">
                        <img src="${s.photoURL || 'logo.png'}" alt="${s.playerName}" class="player-stat-photo">
                        <span class="player-stat-name">${s.playerName}</span>
                    </div>
                    <div class="player-stat-value-group">
                        <span class="event-timestamp">${s.timestamp || ''}</span>
                        ${subDetail}
                    </div>
                `;
                subsList.appendChild(item);
            });
        } else {
            subsList.innerHTML = '<p class="no-data">교체 기록이 없습니다.</p>';
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