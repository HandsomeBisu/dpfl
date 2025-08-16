import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";

async function loadMyPageData(uid) {
    const myManagedTeams = document.getElementById('my-managed-teams');
    const myPlayerProfile = document.getElementById('my-player-profile');
    const greetingElement = document.getElementById('user-greeting');

    // Set loading states
    if (greetingElement) greetingElement.textContent = '로딩 중...';
    if (myManagedTeams) myManagedTeams.innerHTML = '<p class="no-data">팀 정보를 불러오는 중...</p>';
    if (myPlayerProfile) myPlayerProfile.innerHTML = '<p class="no-data">선수 정보를 불러오는 중...</p>';

    try {
        // Fetch all data in parallel for better performance
        const [userDocSnap, teamsSnapshot, playerSnapshot] = await Promise.all([
            getDoc(doc(db, "users", uid)),
            getDocs(query(collection(db, "teams"), where("leader", "==", uid))),
            getDocs(query(collection(db, "players"), where("uid", "==", uid)))
        ]);

        // Render Greeting
        if (greetingElement) {
            if (userDocSnap.exists()) {
                greetingElement.textContent = `안녕하세요, ${userDocSnap.data().username}님.`;
            } else {
                greetingElement.textContent = '안녕하세요, 사용자님.';
            }
        }

        // Render Managed Teams
        if (myManagedTeams) {
            myManagedTeams.innerHTML = teamsSnapshot.empty ? '<p class="no-data">아직 관리하는 팀이 없습니다.</p>' : '';
            teamsSnapshot.forEach((docSnapshot) => {
                const team = docSnapshot.data();
                const teamId = docSnapshot.id;
                const div = document.createElement('div');
                div.className = 'managed-team-item';
                div.innerHTML = `
                    ${team.iconUrl ? `<img src="${team.iconUrl}" alt="${team.name} Icon" class="item-icon">` : '<div class="item-icon" style="background-color: #eee;"></div>'}
                    <div class="item-details">
                        <h3>${team.name}</h3>
                        <p>${team.description.substring(0, 50)}${team.description.length > 50 ? '...' : ''}</p>
                    </div>
                    <a href="manage_team.html?id=${teamId}" class="btn btn-small">팀 관리</a>
                `;
                myManagedTeams.appendChild(div);
            });
        }

        // Render Player Profile
        if (myPlayerProfile) {
            myPlayerProfile.innerHTML = playerSnapshot.empty ? '<p class="no-data">아직 등록된 선수 정보가 없습니다.</p>' : '';
            playerSnapshot.forEach((docSnapshot) => {
                const player = docSnapshot.data();
                const playerId = docSnapshot.id;
                const div = document.createElement('div');
                div.className = 'player-item list-item';
                div.innerHTML = `
                    ${player.photoURL ? `<img src="${player.photoURL}" alt="${player.name}" class="item-icon">` : '<div class="item-icon" style="background-color: #eee;"></div>'}
                    <div class="item-details">
                        <h3>${player.name}</h3>
                        <p>${player.profile}</p>
                        <p>소속팀: ${player.teamName || '무소속'}</p>
                    </div>
                    <div class="item-actions">
                        <a href="edit_player.html?id=${playerId}" class="btn btn-small">프로필 수정</a>
                    </div>
                `;
                myPlayerProfile.appendChild(div);
            });
        }
    } catch (error) {
        console.error("Error loading My Page data:", error);
        if (greetingElement) greetingElement.textContent = '정보를 불러오는데 실패했습니다.';
        if (myManagedTeams) myManagedTeams.innerHTML = '<p class="no-data">팀 정보를 불러오는데 실패했습니다.</p>';
        if (myPlayerProfile) myPlayerProfile.innerHTML = '<p class="no-data">선수 정보를 불러오는데 실패했습니다.</p>';
    }
}

export function initMyPage(user) {
    if (user) {
        loadMyPageData(user.uid);
    }
}
