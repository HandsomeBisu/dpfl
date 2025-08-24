import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

const FORMATIONS = {
    "1-2-1": {
        gk: ["GOLEIRO"],
        def: ["FIXO"],
        mid: ["ALA", "ALA"],
        fwd: ["PIVO"]
    },
    "2-1-1": {
        gk: ["GOLEIRO"],
        def: ["FIXO", "FIXO"],
        mid: ["ALA"],
        fwd: ["PIVO"]
    },
    "1-1-2": {
        gk: ["GOLEIRO"],
        def: ["FIXO"],
        mid: ["ALA"],
        fwd: ["PIVO", "PIVO"]
    }
};

// Helper to create player chip
function createPlayerChip(player) {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    chip.dataset.playerId = player.id;

    const photoDiv = document.createElement('div');
    photoDiv.className = 'player-chip-photo';
    if (player.photoURL) {
        photoDiv.style.backgroundImage = `url(${player.photoURL})`;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-chip-name';
    nameSpan.textContent = player.name;

    chip.appendChild(photoDiv);
    chip.appendChild(nameSpan);

    return chip;
}

// Render pitch based on selected formation
function renderPitch(formationKey) {
    const pitchEl = document.querySelector('.pitch');
    if (!pitchEl) return;

    pitchEl.innerHTML = `
        <!-- Pitch lines -->
        <div class="line middle"></div>
        <div class="line center-circle"></div>
        <div class="line penalty-box-top"></div>
        <div class="line goal-area-top"></div>
        <div class="line penalty-box-bottom"></div>
        <div class="line goal-area-bottom"></div>
    `;

    const formation = FORMATIONS[formationKey];

    Object.keys(formation).reverse().forEach(line => {
        const row = document.createElement('div');
        row.className = `position-row ${line}`;
        formation[line].forEach((pos, index) => {
            const slot = document.createElement('div');
            slot.className = 'position-slot';
            slot.dataset.position = `${line}-${index}`;
            slot.textContent = pos;
            row.appendChild(slot);
        });
        pitchEl.appendChild(row);
    });
}

async function initializeSquadEditor(team, players) {
    const benchList = document.getElementById('bench-list');
    const saveBtn = document.getElementById('save-squad-btn');

    if (!benchList || !saveBtn) return;

    let currentFormation = team.formation || "1-2-1";
    let savedSquad = team.squad || {};

    function setupCustomSelect() {
        const customSelect = document.getElementById('custom-formation-select');
        if (!customSelect) return;

        const trigger = customSelect.querySelector('.custom-select__trigger');
        const options = customSelect.querySelectorAll('.custom-option');
        const selectedText = document.getElementById('selected-formation-text');

        // Set initial value
        const initialOption = document.querySelector(`.custom-option[data-value="${currentFormation}"]`);
        if (initialOption) {
            selectedText.textContent = initialOption.textContent;
            options.forEach(opt => opt.classList.remove('selected'));
            initialOption.classList.add('selected');
        }

        trigger.addEventListener('click', () => {
            customSelect.classList.toggle('open');
        });

        window.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent window click listener from closing the dropdown immediately
                if (option.classList.contains('selected')) {
                    customSelect.classList.remove('open');
                    return;
                }

                const newFormation = option.dataset.value;
                selectedText.textContent = option.textContent;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                customSelect.classList.remove('open');

                if (newFormation !== currentFormation) {
                    currentFormation = newFormation;
                    savedSquad = {}; // Clear squad on formation change
                    placePlayers();
                }
            });
        });
    }

    function placePlayers() {
        renderPitch(currentFormation);
        const pitchSlots = document.querySelectorAll('.pitch .position-slot');
        benchList.innerHTML = '';

        const placedPlayerIds = Object.values(savedSquad);

        for (const position in savedSquad) {
            const playerId = savedSquad[position];
            const player = players.find(p => p.id === playerId);
            if (player) {
                const slot = document.querySelector(`.position-slot[data-position="${position}"]`);
                if (slot) {
                    const playerChip = createPlayerChip(player);
                    slot.innerHTML = '';
                    slot.appendChild(playerChip);
                }
            }
        }

        const benchedPlayers = players.filter(p => !placedPlayerIds.includes(p.id));
        benchedPlayers.forEach(player => {
            const playerChip = createPlayerChip(player);
            benchList.appendChild(playerChip);
        });

        if (window.sortableInstances) {
            window.sortableInstances.forEach(instance => instance.destroy());
        }
        window.sortableInstances = [];
        window.sortableInstances.push(new Sortable(benchList, { group: 'squad', animation: 150, ghostClass: 'sortable-ghost' }));
        pitchSlots.forEach(slot => {
            window.sortableInstances.push(new Sortable(slot, { group: 'squad', animation: 150, ghostClass: 'sortable-ghost' }));
        });
    }

    setupCustomSelect();
    placePlayers();

    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
        const newSquad = {};
        document.querySelectorAll('.pitch .position-slot').forEach(slot => {
            const playerChip = slot.querySelector('.player-chip');
            if (playerChip) {
                newSquad[slot.dataset.position] = playerChip.dataset.playerId;
            }
        });

        try {
            await updateDoc(doc(db, "teams", team.id), { squad: newSquad, formation: currentFormation });
            showCustomAlert('스쿼드가 성공적으로 저장되었습니다.');
            savedSquad = newSquad;
        } catch (error) {
            console.error("Error saving squad:", error);
            showCustomAlert('스쿼드 저장 중 오류가 발생했습니다.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '스쿼드 저장';
        }
    };
}

export async function initEditSquadPage(user) {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('id');
    if (!teamId) {
        showCustomAlert("잘못된 접근입니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const teamDocRef = doc(db, "teams", teamId);
    const teamDocSnap = await getDoc(teamDocRef);

    if (!teamDocSnap.exists() || teamDocSnap.data().leader !== user.uid) {
        showCustomAlert("팀 스쿼드를 편집할 권한이 없습니다.");
        window.location.href = 'mypage.html';
        return;
    }

    const teamData = { id: teamDocSnap.id, ...teamDocSnap.data() };
    
    const playersQuery = query(collection(db, "players"), where("teamId", "==", teamId));
    const playersSnapshot = await getDocs(playersQuery);

    const players = [];
    playersSnapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

    document.getElementById('squad-edit-header').textContent = `${teamData.name} 스쿼드 편집`;

    initializeSquadEditor(teamData, players);
}