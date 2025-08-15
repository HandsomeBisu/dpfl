document.addEventListener('DOMContentLoaded', () => {
    // Firebase Configuration from 구상.txt
    const firebaseConfig = {
        apiKey: "AIzaSyAeHrxMwpArmteEWi4lIdTi54PYRDlLhks",
        authDomain: "dpflsite.firebaseapp.com",
        projectId: "dpflsite",
        storageBucket: "dpflsite.appspot.com",
        messagingSenderId: "884123413396",
        appId: "1:884123413396:web:fde6cb5f92bc1b2386fd81",
        measurementId: "G-5R72BVV5R7"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Fetch and display team rankings
    const rankingBody = document.getElementById('ranking-body');

    function fetchRankings() {
        db.collection("teams").orderBy("승점", "desc").get().then((querySnapshot) => {
            let rank = 1;
            querySnapshot.forEach((doc) => {
                const team = doc.data();
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${rank}</td>
                    <td>${team.팀이름}</td>
                    <td>${team.경기수 || 0}</td>
                    <td>${team.승점 || 0}</td>
                    <td>${team.승 || 0}</td>
                    <td>${team.무 || 0}</td>
                    <td>${team.패 || 0}</td>
                    <td>${team.득점 || 0}</td>
                    <td>${team.실점 || 0}</td>
                    <td>${(team.득점 || 0) - (team.실점 || 0)}</td>
                `;
                
                rankingBody.appendChild(row);
                rank++;
            });
        }).catch((error) => {
            console.error("Error fetching team rankings: ", error);
            rankingBody.innerHTML = '<tr><td colspan="10">순위를 불러오는 데 실패했습니다.</td></tr>';
        });
    }

    // Smooth scroll for the scroll indicator
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            document.getElementById('ranking').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Initial fetch of rankings
    if (rankingBody) {
        fetchRankings();
    }
});
