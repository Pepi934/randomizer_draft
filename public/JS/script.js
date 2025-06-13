const socket = io();

// NOUVELLE FAÇON DE RÉCUPÉRER LES INFOS : depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const draftId = urlParams.get('draftId');
const playerRole = urlParams.get('role');

// Redirige vers le lobby si les informations sont manquantes dans l'URL
if (!draftId || !playerRole || !['blue', 'red'].includes(playerRole)) {
    window.location.href = '/lobby.html';
}

const elements = {
    readyOverlay: document.getElementById('ready-overlay'),
    readyBtn: document.getElementById('ready-btn'),
    readyStatusBlue: document.getElementById('ready-status-blue').querySelector('span'),
    readyStatusRed: document.getElementById('ready-status-red').querySelector('span'),
    draftInterface: document.getElementById('draft-interface'),
    phaseTitle: document.getElementById('phase-title'),
    timerText: document.getElementById('timer-text'),
    timerBar: document.getElementById('timer-bar'),
    championPool: document.getElementById('champion-pool'),
    blueBans: document.getElementById('blue-bans'),
    redBans: document.getElementById('red-bans'),
    bluePicks: document.getElementById('blue-picks'),
    redPicks: document.getElementById('red-picks'),
    roleIcons: document.querySelectorAll('.role-icon'),
    searchInput: document.getElementById('champion-search-input'),
    confirmBtn: document.getElementById('confirm-pick-btn')
};

let localState = {};
let activeFilter = null;
let preselectedChampion = null;

function createEmptySlots() {
    for (let i = 1; i <= 5; i++) {
        elements.blueBans.innerHTML += `<div class="ban-slot" id="blue-ban-${i}"></div>`;
        elements.redBans.innerHTML += `<div class="ban-slot" id="red-ban-${i}"></div>`;
        elements.bluePicks.innerHTML += `<div class="pick-slot" id="blue-pick-${i}"></div>`;
        elements.redPicks.innerHTML += `<div class="pick-slot" id="red-pick-${i}"></div>`;
    }
}

function updateUI(state) {
    if (localState.currentAction && state.currentAction?.slot !== localState.currentAction.slot) {
        preselectedChampion = null;
        elements.confirmBtn.classList.remove('visible');
    }
    localState = state;
    const selectedChamps = new Set([...state.bans.map(b => b.champion), ...state.picks.map(p => p.champion)]);
    document.querySelectorAll('.champion').forEach(el => {
        el.classList.toggle('selected', selectedChamps.has(el.dataset.championName));
    });

    document.querySelectorAll('.pick-slot, .ban-slot').forEach(el => {
        el.innerHTML = '';
        el.className = el.className.split(' ')[0];
    });

    const allSlots = [...state.bans, ...state.picks];
    allSlots.forEach(action => {
        const slotEl = document.getElementById(`${action.team}-${action.type}-${action.slot}`);
        if (slotEl && action.champion && action.champion !== "None") {
            let imagePath = '';
            if (action.type === 'pick') {
                imagePath = `image/league_dataset/champions/splash/${action.champion}_0.jpg`;
            } else {
                imagePath = `image/league_dataset/champions/centered_splash/${action.champion}_0.jpg`;
            }
            slotEl.innerHTML = `<img src="${imagePath}" alt="${action.champion}" data-champion="${action.champion}">`;
        }
    });

    document.querySelectorAll('.pick-slot, .ban-slot').forEach(el => el.classList.remove('active'));
    if (state.currentAction) {
        const activeSlotEl = document.getElementById(`${state.currentAction.team}-${state.currentAction.type}-${state.currentAction.slot}`);
        if (activeSlotEl) activeSlotEl.classList.add('active');
        elements.phaseTitle.textContent = state.currentAction.type === 'ban' ? "Phase de Bans" : "Phase de Picks";
    }

    const teamColor = state.currentAction?.team === 'blue' ? 'var(--blue-team-color)' : 'var(--red-team-color)';
    elements.timerBar.style.backgroundColor = teamColor;
}

function showPreview(championName) {
    const activeSlotEl = document.querySelector('.pick-slot.active, .ban-slot.active');
    if (!activeSlotEl || !localState.currentAction) return;
    
    let imagePath = '';
    if (localState.currentAction.type === 'pick') {
        imagePath = `image/league_dataset/champions/splash/${championName}_0.jpg`;
    } else {
        imagePath = `image/league_dataset/champions/centered_splash/${championName}_0.jpg`;
    }
    activeSlotEl.innerHTML = `<img src="${imagePath}" alt="${championName}" data-champion="${championName}" style="opacity: 0.7;">`;
}

function handleChampionClick(event) {
    const championElement = event.currentTarget;
    if (localState.currentAction?.team !== playerRole || championElement.classList.contains('selected')) {
        return;
    }
    preselectedChampion = championElement.dataset.championName;
    showPreview(preselectedChampion);
    elements.confirmBtn.classList.add('visible');
    socket.emit('preselectChampion', { draftId, champion: preselectedChampion });
}

function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    document.querySelectorAll('.champion').forEach(champElement => {
        const champName = champElement.dataset.championName;
        const champRoles = championData[activeFilter] || [];
        const roleMatch = !activeFilter || champRoles.includes(champName);
        const searchMatch = champName.toLowerCase().includes(searchTerm);
        champElement.style.display = (roleMatch && searchMatch) ? 'block' : 'none';
    });
}

window.onload = () => {
    // La première chose à faire est de réclamer son rôle au serveur
    socket.emit('claimRole', { draftId, role: playerRole });

    const allChampions = new Set(Object.values(championData).flat());
    const championsList = Array.from(allChampions);
    
    championsList.sort().forEach(champ => {
        const img = document.createElement("img");
        img.src = `image/league_dataset/champions/icons/${champ}.png`;
        img.alt = champ;
        img.className = "champion";
        img.dataset.championName = champ;
        img.addEventListener("click", handleChampionClick);
        elements.championPool.appendChild(img);
    });
    
    createEmptySlots();
    
    elements.roleIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const role = icon.dataset.role;
            if (activeFilter === role) {
                activeFilter = null;
                elements.roleIcons.forEach(i => i.style.opacity = '0.6');
            } else {
                activeFilter = role;
                elements.roleIcons.forEach(i => { i.style.opacity = '0.6'; });
                icon.style.opacity = '1';
            }
            applyFilters();
        });
    });

    elements.searchInput.addEventListener('input', applyFilters);

    elements.confirmBtn.addEventListener('click', () => {
        if (preselectedChampion && localState.currentAction?.team === playerRole) {
            socket.emit('draftAction', { draftId, role: playerRole, champion: preselectedChampion });
            preselectedChampion = null;
            elements.confirmBtn.classList.remove('visible');
        }
    });
};

elements.readyBtn.addEventListener('click', () => {
    elements.readyBtn.disabled = true;
    socket.emit('playerReady', { draftId }); // On n'envoie plus le rôle, le serveur le sait
});

socket.on('updateReadyStatus', (readyStatus) => {
    elements.readyStatusBlue.textContent = readyStatus.blue ? 'Prêt' : 'Pas prêt';
    elements.readyStatusBlue.className = readyStatus.blue ? 'ready' : 'not-ready';
    elements.readyStatusRed.textContent = readyStatus.red ? 'Prêt' : 'Pas prêt';
    elements.readyStatusRed.className = readyStatus.red ? 'ready' : 'not-ready';
});

socket.on('draftStarted', (initialState) => {
    elements.readyOverlay.style.display = 'none';
    elements.draftInterface.style.display = 'block';
    updateUI(initialState);
});

socket.on('updateState', (newState) => {
    updateUI(newState);
});

socket.on('updateTimer', (timeLeft) => {
    elements.timerText.textContent = timeLeft;
    if (!localState.currentAction) return;
    const timeLimit = localState.currentAction.type === 'ban' ? DRAFT_CONFIG.BAN_TIME : DRAFT_CONFIG.PICK_TIME;
    const percentage = (timeLeft / timeLimit) * 100;
    elements.timerBar.style.width = `${percentage}%`;
});

socket.on('draftEnded', () => {
    elements.phaseTitle.textContent = "DRAFT TERMINÉE";
    document.querySelectorAll('.pick-slot, .ban-slot').forEach(el => el.classList.remove('active'));
});

socket.on('error', (message) => {
    alert(`Erreur : ${message}`);
    window.location.href = '/lobby.html';
});

socket.on('updatePreselection', ({ champion }) => {
    if (localState.currentAction?.team !== playerRole) {
        showPreview(champion);
    }
});