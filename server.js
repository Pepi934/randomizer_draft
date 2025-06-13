const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rediriger la racine vers index.html (sélecteur d'équipes)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuration de la draft (inchangée)
const DRAFT_CONFIG = {
    BAN_TIME: 30,
    PICK_TIME: 30,
    CHAMPIONS: [ "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie", "Aphelios", "Ashe", "AurelionSol", "Aurora", "Azir", "Bard", "BelVeth", "Blitzcrank", "Brand", "Braum", "Briar", "Caitlyn", "Camille", "Cassiopeia", "ChoGath", "Corki", "Darius", "Diana", "DrMundo", "Draven", "Ekko", "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern", "Janna", "JarvanIV", "Jax", "Jayce", "Jhin", "Jinx", "KaiSa", "Kalista", "Karma", "Karthus", "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Khazix", "Kindred", "Kled", "Ksante", "KogMaw", "LeBlanc", "LeeSin", "Leona", "Lillia", "Lissandra", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai", "MasterYi", "Mel", "Milio", "MissFortune", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus", "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu", "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy", "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "RekSai", "Rell", "Renata", "Renekton", "Rengar", "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain", "Sylas", "Syndra", "TahmKench", "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle", "Tryndamere", "TwistedFate", "Twitch", "Udyr", "Urgot", "Varus", "Vayne", "Veigar", "VelKoz", "Vex", "Vi", "Viego", "Viktor", "Vladimir", "Volibear", "Warwick", "MonkeyKing", "Xayah", "Xerath", "XinZhao", "Yasuo", "Yone", "Yorick", "Yuumi", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"],
    DRAFT_ORDER: [{ team: 'blue', type: 'ban', slot: 1 }, { team: 'red', type: 'ban', slot: 1 }, { team: 'blue', type: 'ban', slot: 2 }, { team: 'red', type: 'ban', slot: 2 }, { team: 'blue', type: 'ban', slot: 3 }, { team: 'red', type: 'ban', slot: 3 }, { team: 'blue', type: 'pick', slot: 1 }, { team: 'red', type: 'pick', slot: 1 }, { team: 'red', type: 'pick', slot: 2 }, { team: 'blue', type: 'pick', slot: 2 }, { team: 'blue', type: 'pick', slot: 3 }, { team: 'red', type: 'pick', slot: 3 }, { team: 'red', type: 'ban', slot: 4 }, { team: 'blue', 'type': 'ban', slot: 4 }, { team: 'red', type: 'ban', slot: 5 }, { team: 'blue', type: 'ban', slot: 5 }, { team: 'red', type: 'pick', slot: 4 }, { team: 'blue', type: 'pick', slot: 4 }, { team: 'blue', type: 'pick', slot: 5 }, { team: 'red', type: 'pick', slot: 5 }]
};

const drafts = {};

function createNewDraft() {
    const draftId = Math.random().toString(36).substr(2, 5).toUpperCase();
    drafts[draftId] = {
        id: draftId,
        players: { blue: null, red: null },
        ready: { blue: false, red: false },
        state: null,
        timerInterval: null,
        preselectedChampion: null
    };
    return draftId;
}

// Les fonctions startDraft, runPhase, handleDraftAction restent inchangées...
function startDraft(draftId) {
    const draft = drafts[draftId];
    if (!draft) return;
    draft.state = {
        phase: 0,
        timer: DRAFT_CONFIG.PICK_TIME,
        picks: [],
        bans: [],
        availableChamps: [...DRAFT_CONFIG.CHAMPIONS].sort()
    };
    io.to(draftId).emit('draftStarted', draft.state);
    runPhase(draftId);
}

function runPhase(draftId) {
    const draft = drafts[draftId];
    if (!draft || !draft.state) return;
    draft.preselectedChampion = null;
    const phase = draft.state.phase;
    if (phase >= DRAFT_CONFIG.DRAFT_ORDER.length) {
        io.to(draftId).emit('draftEnded');
        if (draft.timerInterval) clearInterval(draft.timerInterval);
        return;
    }
    const currentAction = DRAFT_CONFIG.DRAFT_ORDER[phase];
    draft.state.currentAction = currentAction;
    draft.state.timer = currentAction.type === 'ban' ? DRAFT_CONFIG.BAN_TIME : DRAFT_CONFIG.PICK_TIME;
    io.to(draftId).emit('updateState', draft.state);
    if (draft.timerInterval) clearInterval(draft.timerInterval);
    draft.timerInterval = setInterval(() => {
        draft.state.timer--;
        io.to(draftId).emit('updateTimer', draft.state.timer);
        if (draft.state.timer <= 0) {
            const championToConfirm = draft.preselectedChampion || "None";
            handleDraftAction(draftId, draft.state.currentAction.team, championToConfirm);
        }
    }, 1000);
}

function handleDraftAction(draftId, role, champion) {
    const draft = drafts[draftId];
    if (!draft || !draft.state) return;
    const isAlreadyBanned = draft.state.bans.some(b => b.champion === champion);
    const isAlreadyPicked = draft.state.picks.some(p => p.champion === champion);
    if (champion !== "None" && (isAlreadyBanned || isAlreadyPicked)) {
        return;
    }
    const currentAction = draft.state.currentAction;
    if (currentAction.team !== role) return;
    const actionData = { champion, ...currentAction };
    if(currentAction.type === 'ban') {
        draft.state.bans.push(actionData);
    } else {
        draft.state.picks.push(actionData);
    }
    if (champion !== "None") {
      draft.state.availableChamps = draft.state.availableChamps.filter(c => c !== champion);
    }
    io.to(draftId).emit('updateState', draft.state);
    draft.state.phase++;
    runPhase(draftId);
}


io.on('connection', (socket) => {
    // --- NOUVEL ÉVÉNEMENT ---
    // Pour la page principale (team balancer)
    socket.on('requestDraftLinks', () => {
        const draftId = createNewDraft();
        console.log(`Draft ${draftId} créée à la demande de la page principale.`);
        socket.emit('draftLinksCreated', { draftId });
    });

    // Pour le lobby.html
    socket.on('createDraft', () => {
        const draftId = createNewDraft();
        console.log(`Draft ${draftId} créée depuis le lobby.`);
        socket.emit('draftCreated', { draftId });
    });

    socket.on('claimRole', ({ draftId, role }) => {
        const draft = drafts[draftId];
        if (!draft) return socket.emit('error', 'Draft non trouvée.');
        if (draft.players[role] && draft.players[role] !== socket.id) {
            return socket.emit('error', 'Ce rôle est déjà pris.');
        }
        draft.players[role] = socket.id;
        socket.join(draftId);
        console.log(`Joueur ${socket.id} a pris le rôle ${role} dans la draft ${draftId}`);
        io.to(draftId).emit('updateReadyStatus', draft.ready);
    });
    
    // Le reste des événements (playerReady, draftAction, etc.) reste inchangé...
    socket.on('playerReady', ({ draftId }) => {
        const draft = drafts[draftId];
        if (!draft) return;

        let playerRole = null;
        if (draft.players.blue === socket.id) playerRole = 'blue';
        else if (draft.players.red === socket.id) playerRole = 'red';

        if (playerRole) {
            draft.ready[playerRole] = true;
            console.log(`Joueur ${playerRole} (${socket.id}) est prêt.`);
        }

        io.to(draftId).emit('updateReadyStatus', draft.ready);
        
        if (draft.ready.blue && draft.ready.red) {
            console.log(`Les deux joueurs sont prêts pour la draft ${draftId}. Lancement...`);
            if (draft.timerInterval) clearInterval(draft.timerInterval);
            startDraft(draftId);
        }
    });

    socket.on('draftAction', ({ draftId, role, champion }) => {
        handleDraftAction(draftId, role, champion);
    });

    socket.on('preselectChampion', ({ draftId, champion }) => {
        const draft = drafts[draftId];
        if (!draft || !draft.state) return;
        let senderRole = null;
        if (draft.players.blue === socket.id) senderRole = 'blue';
        else if (draft.players.red === socket.id) senderRole = 'red';

        if (senderRole && draft.state.currentAction.team === senderRole) {
            draft.preselectedChampion = champion;
            socket.to(draftId).emit('updatePreselection', { champion });
        }
    });

    socket.on('disconnect', () => {
        // Gérer la déconnexion
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));