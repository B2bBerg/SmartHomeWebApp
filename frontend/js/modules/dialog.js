/**
 * dialog.js – Globale Dialog-Komponenten (Modals, Confirms)
 */
const Dialog = {
    async confirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100000'; // Behebt das Überlappungs-Problem mit anderen Modals
            modal.innerHTML = `
                <div class="table-modal-box" style="max-width: 400px; text-align: center;">
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">${title}</h3>
                    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">${message}</p>
                    <div class="table-modal-actions" style="justify-content: center;">
                        <button class="btn-primary dialog-btn-yes" style="background: var(--error-red) !important; color: white !important; border: none;">Ja</button>
                        <button class="btn-outline dialog-btn-no">Nein</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Klick ausserhalb des Fensters schliesst das Modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });

            modal.querySelector('.dialog-btn-no').onclick = () => { modal.remove(); resolve(false); };
            modal.querySelector('.dialog-btn-yes').onclick = () => { modal.remove(); resolve(true); };
        });
    },

    async alert(title, message, isError = false) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'table-modal';
            modal.style.zIndex = '100000'; // Behebt das Überlappungs-Problem mit anderen Modals
            const headerColor = isError ? 'var(--error-red)' : 'var(--accent-blue)';
            modal.innerHTML = `
                <div class="table-modal-box" style="max-width: 400px; text-align: center;">
                    <h3 style="margin-bottom: 0.5rem; color: ${headerColor};">${title}</h3>
                    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">${message}</p>
                    <div class="table-modal-actions" style="justify-content: center;">
                        <button class="btn-primary dialog-btn-ok" style="background: ${headerColor} !important; color: white !important; border: none;">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Klick ausserhalb des Fensters schliesst das Modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve();
                }
            });

            modal.querySelector('.dialog-btn-ok').onclick = () => { modal.remove(); resolve(); };
        });
    }
};

window.Dialog = Dialog;