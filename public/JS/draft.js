// Initialisation de la connexion avec notre serveur
const socket = io();

// Écouteur pour le bouton "Custom Draft"
document.getElementById("btn-draft").addEventListener("click", () => {
    switchMode("draft");
});

// -- GESTION DE LA SÉLECTION D'ÉQUIPE ET GÉNÉRATION DES LIENS --
// Cette fonction sera appelée quand le serveur nous renverra l'ID de la draft
socket.on('draftLinksCreated', ({ draftId }) => {
    // On trouve la proposition qui a été sélectionnée (elle a une classe 'selected')
    const selectedProposition = document.querySelector('.proposition-container.selected');
    if (!selectedProposition) return;

    // Construction des URLs pour les équipes bleue et rouge
    const baseUrl = window.location.origin;
    // IMPORTANT: Le lien pointe maintenant vers 'draft.html'
    const blueUrl = `${baseUrl}/draft.html?draftId=${draftId}&role=blue`;
    const redUrl = `${baseUrl}/draft.html?draftId=${draftId}&role=red`;
    
    // Création du HTML pour les liens
    const linksHtml = `
        <div class="draft-link-display">
            <p>Lien Équipe Bleue:</p>
            <input type="text" value="${blueUrl}" readonly onclick="this.select()">
            <a href="${blueUrl}" target="_blank" class="link-button">Ouvrir la Draft Bleue</a>
        </div>
        <div class="draft-link-display">
            <p>Lien Équipe Rouge:</p>
            <input type="text" value="${redUrl}" readonly onclick="this.select()">
            <a href="${redUrl}" target="_blank" class="link-button">Ouvrir la Draft Rouge</a>
        </div>
    `;

    // Insertion des liens dans la proposition sélectionnée
    const linksContainer = selectedProposition.querySelector('.draft-links-placeholder');
    linksContainer.innerHTML = linksHtml;
    linksContainer.style.display = 'block';

    // Cache les autres propositions
    document.querySelectorAll('.proposition-container:not(.selected)').forEach(prop => {
        prop.style.display = 'none';
    });
});

/**
 * Fonction appelée quand un utilisateur clique sur "Choisir cette équipe"
 * @param {HTMLElement} button - Le bouton qui a été cliqué.
 */
function selectTeamProposition(button) {
    const proposition = button.closest('.proposition-container');
    
    // Ajoute une classe pour savoir quelle proposition a été choisie
    proposition.classList.add('selected');
    
    // Désactive tous les boutons pour ne pas pouvoir générer de nouveaux liens
    document.querySelectorAll('.choose-team-btn').forEach(btn => {
        btn.disabled = true;
        btn.textContent = 'Sélectionnée';
    });
    
    // Cache le bouton "Lancer"
    document.getElementById('generate-button').style.display = 'none';

    // Demande au serveur de créer une draft et de nous renvoyer les liens
    socket.emit('requestDraftLinks');
}


async function generateDraftTeams() {
    const players = Array.from(document.querySelectorAll('.player-input')).map(input => ({
        name: input.querySelector('textarea').value.trim(),
        level: parseInt(input.querySelector('select').value, 10),
    })).filter(p => p.name);

    if (players.length !== 10) {
        showNotification("Veuillez entrer les noms et niveaux de 10 joueurs.");
        return;
    }

    const combinations = getCombinations(players, 5);
    const validTeams = combinations.map(blueTeam => {
        const redTeam = players.filter(p => !blueTeam.includes(p));
        const blueLevel = blueTeam.reduce((sum, p) => sum + p.level, 0);
        const redLevel = redTeam.reduce((sum, p) => sum + p.level, 0);
        const diff = Math.abs(blueLevel - redLevel);
        
        if (diff <= 1) {
            const blueTeamNames = blueTeam.map(p => p.name).sort().join(',');
            return { blueTeam, redTeam, blueLevel, redLevel, id: blueTeamNames };
        }
        return null;
    }).filter(Boolean);

    const uniqueValidTeams = Array.from(new Map(validTeams.map(team => [team.id, team])).values());

    if (uniqueValidTeams.length === 0) {
        showNotification("Impossible de trouver des équipes équilibrées.");
        return;
    }

    const shuffledTeams = uniqueValidTeams.sort(() => 0.5 - Math.random());
    const propositionsToShow = shuffledTeams.slice(0, 3);
    
    const teamsDiv = document.querySelector(".teams");
    teamsDiv.innerHTML = ''; // Vider les résultats précédents

    propositionsToShow.forEach((chosen, index) => {
        // --- HTML MODIFIÉ ---
        // Ajout d'un bouton "Choisir" et d'un placeholder pour les liens
        const propositionHtml = `
            <div class="proposition-container">
                <h3>Proposition ${index + 1}</h3>
                <div class="proposition-teams">
                    <div class='team' id='blue-side'>
                        <h2>Blue Side (Total: ${chosen.blueLevel})</h2>
                        <ul>${chosen.blueTeam.map(p => `<li>${p.name} (Niv: ${p.level})</li>`).join('')}</ul>
                    </div>
                    <div class='team' id='red-side'>
                        <h2>Red Side (Total: ${chosen.redLevel})</h2>
                        <ul>${chosen.redTeam.map(p => `<li>${p.name} (Niv: ${p.level})</li>`).join('')}</ul>
                    </div>
                </div>
                <!-- Placeholder pour les futurs liens de draft -->
                <div class="draft-links-placeholder" style="display: none;"></div>
                <!-- Bouton pour sélectionner cette équipe -->
                <button class="choose-team-btn" onclick="selectTeamProposition(this)">Choisir cette équipe</button>
            </div>
        `;
        teamsDiv.innerHTML += propositionHtml;
    });

    teamsDiv.style.display = "flex";
    document.getElementById('generate-button').style.display = 'none'; // Cacher le bouton "Lancer"
}

// Les fonctions showNotification, switchMode et getCombinations restent ici
function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => { notification.style.opacity = 1; }, 10);
    setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => { notification.style.display = 'none'; }, 500);
    }, duration);
}

function switchMode(mode) {
    document.querySelectorAll(".mode-button").forEach(btn => btn.classList.remove("active"));
    document.getElementById("btn-" + mode).classList.add("active");
    const playersContainer = document.getElementById("players");
    playersContainer.innerHTML = "";
    const numberOfPlayers = mode === "tft" ? 8 : 10;
    playersContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    for (let i = 1; i <= numberOfPlayers; i++) {
        const playerInput = document.createElement("div");
        playerInput.classList.add("player-input");
        playerInput.innerHTML = `
            <textarea placeholder="Nom du joueur ${i}"></textarea>
            <select>${[...Array(11).keys()].map(n => `<option value="${n}">${n}</option>`).join('')}</select>`;
        playersContainer.appendChild(playerInput);
    }
    document.querySelector(".teams").style.display = "none";
    document.getElementById('generate-button').style.display = 'inline-block';
    document.getElementById("generate-button").onclick = mode === "tft" ? generateTFTTeams : generateDraftTeams;
}

function getCombinations(arr, n) {
    const result = [];
    function helper(start, combo) {
        if (combo.length === n) {
            result.push(combo);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            helper(i + 1, combo.concat([arr[i]]));
        }
    }
    helper(0, []);
    return result;
}

// Initialise le mode par défaut
switchMode("draft");