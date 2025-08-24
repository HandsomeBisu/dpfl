import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { auth } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";
import { initMyPage } from "../pages/myPage.js";
import { initTeamManagementPage, initEditTeamPage, initEditPlayerPage } from "../pages/teamManagement.js";
import { initPlayerRegisterPage } from "../pages/playerRegister.js";
import { initAdminPage } from "../pages/admin.js";
import { initHomePage } from "../pages/home.js";
import { initTeamDetailPage } from "../pages/teamDetail.js";
import { initPlayerDetailPage } from "../pages/playerDetail.js";
import { initTeamRegisterPage } from "../pages/teamRegister.js";
import { initPlayerRankingPage } from "../pages/playerRanking.js";
import { initMatchReportPage } from "../pages/matchReport.js";
import { initRecruitPlayerPage } from "../pages/recruitPlayer.js";
import { initEditSquadPage } from "../pages/editSquad.js";

const protectedRoutes = [
    'mypage.html',
    'manage_team.html',
    'edit_team.html',
    'edit_player.html',
    'register_player.html',
    'register_team.html',
    'recruit_player.html',
    'edit_squad.html'
];

function updateNav(user) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (user) {
        navLinks.innerHTML = `
            <li><a href="team_ranking.html">팀 순위</a></li>
            <li><a href="player_ranking.html">개인 순위</a></li>
            <li><a href="schedule.html">경기 일정</a></li>
            <li><a href="mypage.html">마이페이지</a></li>
            <li><a href="#" id="logout-btn">로그아웃</a></li>
        `;
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Logout failed:", error);
                showCustomAlert("로그아웃 중 오류가 발생했습니다.");
            }
        });
    } else {
        navLinks.innerHTML = `
            <li><a href="login.html">로그인</a></li>
            <li><a href="team_ranking.html">팀 순위</a></li>
            <li><a href="player_ranking.html">개인 순위</a></li>
            <li><a href="schedule.html">경기 일정</a></li>
        `;
    }
}

function getCurrentPath() {
    return window.location.pathname.split("/").pop() || 'index.html';
}

function router(user) {
    const path = getCurrentPath();

    // Handle protected routes
    if (protectedRoutes.includes(path) && !user) {
        window.location.href = 'login.html';
        return;
    }

    // Route to the correct page initializer
    switch (path) {
        case 'index.html':
            initHomePage();
            break;
        case 'team_ranking.html':
            initHomePage(); // Assuming team ranking is also on the home page logic
            break;
        case 'player_ranking.html':
            initPlayerRankingPage();
            break;
        case 'match_report.html':
            initMatchReportPage();
            break;
        case 'register_player.html':
            initPlayerRegisterPage(user);
            break;
        case 'register_team.html':
            initTeamRegisterPage(user);
            break;
        case 'team_detail.html':
            initTeamDetailPage();
            break;
        case 'player_detail.html':
            initPlayerDetailPage();
            break;
        case 'mypage.html':
            initMyPage(user);
            break;
        case 'manage_team.html':
            initTeamManagementPage(user);
            break;
        case 'edit_team.html':
            initEditTeamPage(user);
            break;
        case 'edit_player.html':
            initEditPlayerPage(user);
            break;
        case 'admin.html':
            initAdminPage();
            break;
        case 'recruit_player.html':
            initRecruitPlayerPage(user);
            break;
        case 'edit_squad.html':
            initEditSquadPage(user);
            break;
        default:
            // 정의되지 않은 경로로 접근 시 콘솔에 로그를 남기거나 404 페이지로 리디렉션 할 수 있습니다.
    }
}

export function listenAuthState() {
    onAuthStateChanged(auth, user => {
        const verifiedUser = (user && user.emailVerified) ? user : null;
        updateNav(verifiedUser);
        router(verifiedUser);
    });
}