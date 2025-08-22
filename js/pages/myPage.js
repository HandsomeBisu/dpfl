import { collection, query, where, getDocs, doc, getDoc, updateDoc, writeBatch, orderBy, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert, showCustomConfirm } from "../ui/alerts.js";
import { uploadToCloudinary } from "../cloudinary/upload.js";

// --- Data Loading Functions ---

async function getPlayerStats(playerId) {
    const stats = { goals: 0, assists: 0 };
    const matchesSnapshot = await getDocs(collection(db, "matches"));

    matchesSnapshot.forEach(matchDoc => {
        const matchData = matchDoc.data();
        if (matchData.scorers && Array.isArray(matchData.scorers)) {
            matchData.scorers.forEach(scorer => {
                if (scorer.playerId === playerId) {
                    stats.goals += scorer.goals;
                }
            });
        }
        if (matchData.assists && Array.isArray(matchData.assists)) {
            matchData.assists.forEach(assist => {
                if (assist.playerId === playerId) {
                    stats.assists += 1;
                }
            });
        }
    });
    return stats;
}

async function getNextMatch(teamId) {
    if (!teamId) return null;
    const today = new Date().toISOString().split('T')[0];
    const q = query(
        collection(db, "matches"), 
        where("status", "==", "scheduled"),
        where("date", ">=", today),
        orderBy("date"),
        limit(1)
    );

    const snapshot = await getDocs(q);
    let nextMatch = null;
    for (const doc of snapshot.docs) {
        const match = doc.data();
        if(match.homeTeamId === teamId || match.awayTeamId === teamId) {
            nextMatch = match;
            break;
        }
    }
    return nextMatch;
}

async function loadMyPageData(uid) {
    const containers = {
        greeting: document.getElementById('user-greeting'),
        profile: document.getElementById('my-player-profile'),
        profileActions: document.getElementById('player-profile-actions'),
        stats: document.getElementById('my-player-stats'),
        team: document.getElementById('my-teams'),
        nextMatch: document.getElementById('my-next-match'),
        requests: document.getElementById('recruitment-requests')
    };

    Object.values(containers).forEach(c => { if(c) c.innerHTML = '<p class="no-data">로딩 중...</p>'; });

    try {
        const playerQuery = query(collection(db, "players"), where("uid", "==", uid));
        const playerSnapshot = await getDocs(playerQuery);

        if (playerSnapshot.empty) {
            Object.values(containers).forEach(c => { if(c) c.innerHTML = '<p class="no-data">등록된 선수 정보가 없습니다.</p>'; });
            if(containers.greeting) containers.greeting.textContent = '안녕하세요! 선수 등록을 먼저 해주세요.';
            return;
        }

        const playerDoc = playerSnapshot.docs[0];
        const playerData = playerDoc.data();
        const playerId = playerDoc.id;

        const [playerStats, teamDocSnap] = await Promise.all([
            getPlayerStats(playerId),
            playerData.teamId ? getDoc(doc(db, "teams", playerData.teamId)) : null
        ]);

        const nextMatch = teamDocSnap ? await getNextMatch(teamDocSnap.id) : null;

        if(containers.greeting) containers.greeting.textContent = `안녕하세요, ${playerData.name}님.`;
        if (containers.profile) {
            containers.profile.innerHTML = `
                <div class="list-item">
                    <div class="item-content">
                        ${playerData.photoURL ? `<img src="${playerData.photoURL}" alt="${playerData.name}" class="item-icon">` : '<div class="item-icon placeholder-icon"></div>'}
                        <div class="item-details">
                            <h3>${playerData.name}</h3>
                            <p>${playerData.profile}</p>
                        </div>
                    </div>
                </div>`;
        }

        if (containers.profileActions) {
            containers.profileActions.innerHTML = `
                <form id="update-photo-form" data-player-id="${playerId}" style="margin-bottom: 1rem;">
                    <label for="new-photo-input" style="display: block; margin-bottom: 0.5rem;">프로필 사진 변경</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="file" id="new-photo-input" accept="image/*" required style="flex-grow: 1;">
                        <button type="submit" class="btn btn-small">저장</button>
                    </div>
                </form>
                <button class="btn btn-danger delete-profile-btn" data-player-id="${playerId}">프로필 삭제</button>
            `;
        }

        if (containers.stats) {
            containers.stats.innerHTML = `
                <div class="stat-item"><strong>득점:</strong><span>${playerStats.goals}</span></div>
                <div class="stat-item"><strong>도움:</strong><span>${playerStats.assists}</span></div>
            `;
        }

        if (containers.team) {
            if (teamDocSnap && teamDocSnap.exists()) {
                const teamData = teamDocSnap.data();
                const isManager = teamData.leader === uid;
                containers.team.innerHTML = `
                    <div class="list-item">
                         ${teamData.iconUrl ? `<img src="${teamData.iconUrl}" alt="${teamData.name} Icon" class="item-icon">` : '<div class="item-icon placeholder-icon"></div>'}
                        <div class="item-details">
                            <h3>${teamData.name}</h3>
                        </div>
                        <div class="item-actions">
                            ${isManager 
                                ? `<a href="manage_team.html?id=${teamDocSnap.id}" class="btn btn-small">팀 관리</a>` 
                                : `<button class="btn btn-small btn-danger leave-team-btn" data-player-id="${playerId}">팀 탈퇴</button>`}
                        </div>
                    </div>`;
            } else {
                containers.team.innerHTML = '<p class="no-data">소속된 팀이 없습니다.</p>';
            }
        }

        if (containers.nextMatch) {
            if (nextMatch) {
                const opponent = nextMatch.homeTeamId === playerData.teamId ? nextMatch.awayTeamName : nextMatch.homeTeamName;
                containers.nextMatch.innerHTML = `
                    <p><strong>상대:</strong> ${opponent}</p>
                    <p><strong>날짜:</strong> ${new Date(nextMatch.date).toLocaleString('ko-KR')}</p>
                `;
            } else {
                containers.nextMatch.innerHTML = '<p class="no-data">예정된 경기가 없습니다.</p>';
            }
        }

        if (containers.requests) loadRecruitmentRequests(playerId, !!playerData.teamId);

    } catch (error) {
        console.error("Error loading My Page data:", error);
        Object.values(containers).forEach(c => { if(c) c.innerHTML = '<p class="no-data">정보를 불러오는 데 실패했습니다.</p>'; });
    }
}

async function loadRecruitmentRequests(playerId, isPlayerInTeam) {
    const requestsContainer = document.getElementById('recruitment-requests');
    if (!requestsContainer) return;

    if (isPlayerInTeam) {
        requestsContainer.innerHTML = '<p class="no-data">팀에 소속된 동안에는 새로운 제안을 받을 수 없습니다.</p>';
        return;
    }

    requestsContainer.innerHTML = '<p class="no-data">제안을 불러오는 중...</p>';

    try {
        const q = query(collection(db, "recruitmentRequests"), where("playerId", "==", playerId), where("status", "==", "pending"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            requestsContainer.innerHTML = '<p class="no-data">받은 팀 제안이 없습니다.</p>';
            return;
        }

        requestsContainer.innerHTML = '';
        snapshot.forEach(docSnapshot => {
            const request = docSnapshot.data();
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="item-details">
                    <p><strong>'${request.teamName}'</strong> 팀에서 영입 제안을 보냈습니다.</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-accept" data-request-id="${docSnapshot.id}" data-team-id="${request.teamId}" data-team-name="${request.teamName}">수락</button>
                    <button class="btn btn-small btn-danger btn-decline" data-request-id="${docSnapshot.id}">거절</button>
                </div>
            `;
            requestsContainer.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading recruitment requests:", error);
        requestsContainer.innerHTML = '<p class="no-data">제안을 불러오는 데 실패했습니다.</p>';
    }
}

async function handleRecruitmentAction(playerId, requestId, teamId, teamName, isAccept) {
    const playerDocRef = doc(db, "players", playerId);
    const requestDocRef = doc(db, "recruitmentRequests", requestId);

    try {
        if (isAccept) {
            const playerDoc = await getDoc(playerDocRef);
            if (playerDoc.exists() && playerDoc.data().teamId) {
                showCustomAlert("이미 다른 팀에 소속되어 있습니다. 제안을 수락할 수 없습니다.");
                return;
            }

            const batch = writeBatch(db);
            batch.update(playerDocRef, { teamId: teamId, teamName: teamName });
            batch.update(requestDocRef, { status: 'accepted' });

            const otherRequestsQuery = query(collection(db, "recruitmentRequests"), where("playerId", "==", playerId), where("status", "==", "pending"));
            const otherRequestsSnapshot = await getDocs(otherRequestsQuery);
            otherRequestsSnapshot.forEach(docSnapshot => {
                if (docSnapshot.id !== requestId) {
                    batch.update(docSnapshot.ref, { status: 'declined' });
                }
            });

            await batch.commit();
            showCustomAlert(`'${teamName}' 팀에 성공적으로 합류했습니다!`);
        } else {
            await updateDoc(requestDocRef, { status: 'declined' });
            showCustomAlert('제안을 거절했습니다.');
        }
    } catch (error) {
        console.error("Error handling recruitment action:", error);
        showCustomAlert("요청 처리 중 오류가 발생했습니다.");
    } finally {
        const uid = window.currentUser?.uid;
        if (uid) loadMyPageData(uid);
    }
}

async function handleLeaveTeam(playerId) {
    const confirmed = await showCustomConfirm("정말로 팀을 탈퇴하시겠습니까?");
    if (confirmed) {
        try {
            const playerDocRef = doc(db, "players", playerId);
            await updateDoc(playerDocRef, { teamId: null, teamName: '무소속' });
            showCustomAlert("팀에서 탈퇴했습니다.");
            const uid = window.currentUser?.uid;
            if (uid) loadMyPageData(uid);
        } catch (error) {
            console.error("Error leaving team:", error);
            showCustomAlert("팀 탈퇴 중 오류가 발생했습니다.");
        }
    }
}

async function handleDeleteProfile(playerId, uid) {
    const confirmed = await showCustomConfirm("정말로 선수 프로필을 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
        // Check if the user is a team leader
        const teamQuery = query(collection(db, "teams"), where("leader", "==", uid));
        const teamSnapshot = await getDocs(teamQuery);
        if (!teamSnapshot.empty) {
            showCustomAlert("팀을 소유하고 있어 프로필을 삭제할 수 없습니다.");
            return;
        }

        // Check if the player is in any team
        const playerDocRef = doc(db, "players", playerId);
        const playerDoc = await getDoc(playerDocRef);
        if (playerDoc.exists() && playerDoc.data().teamId) {
            showCustomAlert("팀에 소속되어 있어 프로필을 삭제할 수 없습니다.");
            return;
        }

        // Delete the player document
        await deleteDoc(doc(db, "players", playerId));

        showCustomAlert("선수 프로필이 성공적으로 삭제되었습니다.");
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error deleting player profile:", error);
        showCustomAlert("프로필 삭제 중 오류가 발생했습니다.");
    }
}

function setupMyPageListeners() {
    const container = document.querySelector('.container');
    container?.addEventListener('click', async (e) => {
        const target = e.target;
        const playerQuery = query(collection(db, "players"), where("uid", "==", window.currentUser.uid));
        const playerSnapshot = await getDocs(playerQuery);
        if (playerSnapshot.empty) return;
        const playerId = playerSnapshot.docs[0].id;

        if (target.matches('.btn-accept')) {
            const { requestId, teamId, teamName } = target.dataset;
            handleRecruitmentAction(playerId, requestId, teamId, teamName, true);
        } else if (target.matches('.btn-decline')) {
            const { requestId } = target.dataset;
            handleRecruitmentAction(playerId, requestId, null, null, false);
        } else if (target.matches('.leave-team-btn')) {
            handleLeaveTeam(playerId);
        } else if (target.matches('.delete-profile-btn')) {
            handleDeleteProfile(playerId, window.currentUser.uid);
        }

        // Handle photo update form submission
        const updatePhotoForm = document.getElementById('update-photo-form');
        if (updatePhotoForm) {
            updatePhotoForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitButton = e.target.querySelector('button[type="submit"]');
                const fileInput = e.target.querySelector('#new-photo-input');
                const file = fileInput.files[0];

                if (!file) {
                    showCustomAlert('새로운 프로필 사진을 선택해주세요.');
                    return;
                }

                submitButton.disabled = true;
                submitButton.textContent = '저장 중...';

                try {
                    const newPhotoURL = await uploadToCloudinary(file);
                    if (!newPhotoURL) {
                        throw new Error('Cloudinary upload failed.');
                    }

                    const playerDocRef = doc(db, "players", playerId);
                    await updateDoc(playerDocRef, { photoURL: newPhotoURL });

                    showCustomAlert('프로필 사진이 성공적으로 변경되었습니다.');
                    location.reload();

                } catch (error) {
                    console.error('Error updating profile photo:', error);
                    showCustomAlert('사진 변경 중 오류가 발생했습니다.');
                    submitButton.disabled = false;
                    submitButton.textContent = '저장';
                }
            });
        }
    });
}

export function initMyPage(user) {
    if (user) {
        window.currentUser = user;
        loadMyPageData(user.uid);
        setupMyPageListeners();
    }
}