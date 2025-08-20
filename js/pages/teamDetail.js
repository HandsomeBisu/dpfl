import { doc, getDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";

// --- Rendering Functions ---

function createPlayerChip(player) {
    const chip = document.createElement('div');
    chip.className = 'player-chip';

    const photoDiv = document.createElement('div');
    photoDiv.className = 'player-chip-photo';
    if (player && player.photoURL) {
        photoDiv.style.backgroundImage = `url(${player.photoURL})`;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-chip-name';
    nameSpan.textContent = player ? player.name : 'Empty';

    chip.appendChild(photoDiv);
    chip.appendChild(nameSpan);

    return chip;
}

function renderReadOnlySquad(squadData, players, container) {
    container.innerHTML = `
        <div class="pitch">
            <div class="line middle"></div>
            <div class="line center-circle"></div>
            <div class="line penalty-box-top"></div>
            <div class="line penalty-box-bottom"></div>
            <div class="position-row forwards">
                <div class="position-slot" data-position="lf">LF</div>
                <div class="position-slot" data-position="rf">RF</div>
            </div>
            <div class="position-row midfielders">
                <div class="position-slot" data-position="cm">PIVO</div>
            </div>
            <div class="position-row defenders">
                <div class="position-slot" data-position="ld">ALA</div>
                <div class="position-slot" data-position="rd">ALA</div>
            </div>
            <div class="position-row goalkeeper">
                <div class="position-slot" data-position="gk">GOLEIRO</div>
            </div>
        </div>
    `;

    for (const position in squadData) {
        const playerId = squadData[position];
        const player = players.find(p => p.id === playerId);
        const slot = container.querySelector(`.position-slot[data-position="${position}"]`);
        if (slot && player) {
            const playerChip = createPlayerChip(player);
            slot.innerHTML = '';
            slot.appendChild(playerChip);
        }
    }
}

async function loadTeamDetails(teamId) {
    const teamInfoContainer = document.getElementById('team-info-container');
    const leaderInfo = document.getElementById('leader-info');
    const membersList = document.getElementById('members-list');
    const squadDisplay = document.getElementById('squad-display');

    if (!teamInfoContainer || !membersList || !leaderInfo || !squadDisplay) return;

    try {
        // 1. Fetch Team Data
        const teamDocRef = doc(db, "teams", teamId);
        const teamDocSnap = await getDoc(teamDocRef);

        if (!teamDocSnap.exists()) {
            teamInfoContainer.innerHTML = '<div class="team-header"><h1>팀을 찾을 수 없습니다.</h1></div>';
            return;
        }
        const team = { id: teamDocSnap.id, ...teamDocSnap.data() };
        document.title = `${team.name} 정보 - DPFL`;

        // 2. Fetch Players and Leader's player profile in parallel
        const playersQuery = query(collection(db, "players"), where("teamId", "==", teamId), orderBy("name"));
        const leaderPlayerQuery = query(collection(db, "players"), where("uid", "==", team.leader));
        
        const [playersSnapshot, leaderPlayerSnapshot] = await Promise.all([
            getDocs(playersQuery),
            getDocs(leaderPlayerQuery)
        ]);

        const players = [];
        playersSnapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
        
        const leaderPlayerData = leaderPlayerSnapshot.empty ? null : leaderPlayerSnapshot.docs[0].data();

        // 3. Render all components
        teamInfoContainer.innerHTML = `
            <div class="team-header">
                ${team.iconUrl ? `<img src="${team.iconUrl}" alt="${team.name} Icon" class="team-icon">` : '<div class="team-icon"></div>'}
                <h1>${team.name}</h1>
                <p>${team.description}</p>
            </div>
        `;

        if (leaderPlayerData) {
            leaderInfo.innerHTML = `
                <div class="member-card">
                    ${leaderPlayerData.photoURL ? `<img src="${leaderPlayerData.photoURL}" alt="${leaderPlayerData.name}" class="member-photo">` : '<div class="member-photo-placeholder"></div>'}
                    <div class="member-info">
                        <h3>${leaderPlayerData.name}</h3>
                    </div>
                </div>
            `;
        } else {
            leaderInfo.innerHTML = '<p>정보 없음</p>';
        }

        membersList.innerHTML = '';
        if (players.length === 0) {
            membersList.innerHTML = '<p class="no-data">소속된 멤버가 없습니다.</p>';
        } else {
            players.forEach(player => {
                const memberLink = document.createElement('a');
                memberLink.href = `player_detail.html?id=${player.id}`;
                memberLink.className = 'member-card-link';

                const memberCard = document.createElement('div');
                memberCard.className = 'member-card';
                memberCard.innerHTML = `
                    ${player.photoURL ? `<img src="${player.photoURL}" alt="${player.name}" class="member-photo">` : '<div class="member-photo-placeholder"></div>'}
                    <div class="member-info">
                        <h4>${player.name}</h4>
                    </div>
                `;
                memberLink.appendChild(memberCard);
                membersList.appendChild(memberLink);
            });
        }

        renderReadOnlySquad(team.squad || {}, players, squadDisplay);

    } catch (error) {
        console.error("Error loading team details:", error);
        teamInfoContainer.innerHTML = '<div class="team-header"><h1>정보를 불러오는 데 실패했습니다.</h1></div>';
    }
}

export function initTeamDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('id');
    if (teamId) {
        loadTeamDetails(teamId);
    } else {
        const container = document.getElementById('team-info-container');
        if (container) {
            container.innerHTML = '<div class="team-header"><h1>팀을 찾을 수 없습니다.</h1><p>올바른 경로로 접근했는지 확인해주세요.</p></div>';
        }
    }
}
