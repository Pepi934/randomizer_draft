const socket = io();

const createBtn = document.getElementById('create-btn');
const linksSection = document.getElementById('links-section');
const blueLinkInput = document.getElementById('blue-link');
const redLinkInput = document.getElementById('red-link');

createBtn.addEventListener('click', () => {
    socket.emit('createDraft');
    createBtn.disabled = true;
});

socket.on('draftCreated', ({ draftId }) => {
    const baseUrl = window.location.origin;
    // --- MODIFICATION IMPORTANTE ---
    // Les liens pointent maintenant vers draft.html
    const blueUrl = `${baseUrl}/draft.html?draftId=${draftId}&role=blue`;
    const redUrl = `${baseUrl}/draft.html?draftId=${draftId}&role=red`;

    blueLinkInput.value = blueUrl;
    redLinkInput.value = redUrl;

    linksSection.style.display = 'block';
});

document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', () => {
        const linkId = button.dataset.linkId;
        const linkInput = document.getElementById(linkId);
        linkInput.select();
        document.execCommand('copy');
        
        button.textContent = 'Copié !';
        setTimeout(() => {
            button.textContent = 'Copier';
        }, 1500);
    });
});