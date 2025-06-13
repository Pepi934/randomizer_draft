// Écouteur d'événement pour le bouton "Custom TFT"
document.getElementById("btn-tft").addEventListener("click", () => {
    switchMode("tft");
});

/**
 * Génère les équipes pour le mode TFT.
 * Note: La fonction showNotification est définie dans draft.js et est disponible globalement.
 */
function generateTFTTeams() {
    const players = [];
    const playerInputs = document.querySelectorAll('.player-input');

    playerInputs.forEach(input => {
        const name = input.querySelector('textarea').value.trim();
        const level = parseInt(input.querySelector('select').value, 10);
        if (name) players.push({ name, level });
    });

    if (players.length !== 8) {
        // Utilise la nouvelle fonction de notification
        showNotification("Veuillez entrer exactement 8 joueurs.");
        return;
    }

    // Logique pour créer des paires de joueurs
    const pairs = [];
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            pairs.push({
                team: [players[i], players[j]],
                total: players[i].level + players[j].level
            });
        }
    }

    // Logique pour trouver les ensembles valides de 4 équipes
    const validSets = [];
    for (let a = 0; a < pairs.length; a++) {
        for (let b = a + 1; b < pairs.length; b++) {
            for (let c = b + 1; c < pairs.length; c++) {
                for (let d = c + 1; d < pairs.length; d++) {
                    const allPlayersInSet = [
                        ...pairs[a].team, ...pairs[b].team,
                        ...pairs[c].team, ...pairs[d].team
                    ];
                    
                    const names = allPlayersInSet.map(p => p.name);
                    const uniqueNames = new Set(names);

                    if (uniqueNames.size === 8) {
                        const teams = [pairs[a], pairs[b], pairs[c], pairs[d]];
                        const variance = getLevelVariance(teams.map(t => t.total));
                        validSets.push({ teams, variance });
                    }
                }
            }
        }
    }

    if (validSets.length === 0) {
        showNotification("Impossible de créer des équipes équilibrées avec ces niveaux.");
        return;
    }

    // Trie pour trouver l'ensemble avec le moins de variance
    validSets.sort((a, b) => a.variance - b.variance);
    const chosen = validSets[0].teams;

    const teamsDiv = document.querySelector(".teams");
    teamsDiv.innerHTML = ""; // Vide les résultats précédents

    // Affiche les nouvelles équipes
    chosen.forEach((teamObj, index) => {
        const div = document.createElement('div');
        div.classList.add('team');
        div.style.borderLeft = `6px solid hsl(${index * 90}, 70%, 50%)`; // Couleurs différentes par équipe
        div.innerHTML = `<h2>Équipe ${index + 1} (Total: ${teamObj.total})</h2><ul>${teamObj.team.map(p => `<li>${p.name} (Niv: ${p.level})</li>`).join('')}</ul>`;
        teamsDiv.appendChild(div);
    });

    teamsDiv.style.display = 'flex';
    document.getElementById("reroll-button").style.display = "inline-block";
}

/**
 * Calcule la variance d'un tableau de nombres (pour l'équilibrage).
 * @param {Array<number>} totals Le tableau des totaux de niveaux par équipe.
 * @returns {number} La variance.
 */
function getLevelVariance(totals) {
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    return totals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0);
}