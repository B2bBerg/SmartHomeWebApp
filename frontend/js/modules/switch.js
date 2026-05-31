/**
 * Switch & Control Module for SmartHome Tiles
 */
const SwitchRenderer = {
    renderToggle(container) {
        container.innerHTML = `
            <div class="switch-container">
                <label class="ui-switch">
                    <input type="checkbox" class="switch-input">
                    <span class="slider"></span>
                </label>
                <span class="switch-status">AUS</span>
            </div>
        `;
    },

    setupToggle(container, dpId) {
        if (!dpId) return;
        const input = container.querySelector('.switch-input');
        const statusText = container.querySelector('.switch-status');

        // Initialen Status aus Live-Daten laden
        window.API.getLiveData().then(liveData => {
            if (liveData && liveData[dpId] !== undefined) {
                const state = liveData[dpId];
                const isChecked = state === true || String(state).toLowerCase() === 'true' || state === 1 || state === 'ON';
                input.checked = isChecked;
                statusText.textContent = isChecked ? 'AN' : 'AUS';
            }
        }).catch(e => console.warn("Fehler beim Laden des Initial-Status:", e));

        input.onchange = (e) => {
            const newState = e.target.checked;
            statusText.textContent = newState ? 'AN' : 'AUS';
            
            if (typeof window.API.setActorState === 'function') {
                window.API.setActorState(dpId, newState);
            } else {
                window.API.setActuatorState(dpId, newState);
            }
        };
    },

    renderShutter2Way(container) {
        container.innerHTML = `
            <div class="shutter-container">
                <button class="shutter-btn btn-up" data-role="up">&#9650;</button>
                <button class="shutter-btn btn-down" data-role="down">&#9660;</button>
            </div>
        `;
    },

    setupShutter2Way(container, dps) {
        if (!dps) return;
        container.querySelectorAll('.shutter-btn').forEach(btn => {
            btn.onclick = () => {
                const dpId = dps[btn.dataset.role];
                if (dpId) {
                    if (typeof window.API.setActorState === 'function') {
                        window.API.setActorState(dpId, true);
                    } else {
                        window.API.setActuatorState(dpId, true);
                    }
                }
            };
        });
    },

    renderShutter3Way(container) {
        container.innerHTML = `
            <div class="shutter-container">
                <button class="shutter-btn btn-up" data-role="up">&#9650;</button>
                <button class="shutter-btn btn-stop" data-role="stop"><div class="stop-icon"></div></button>
                <button class="shutter-btn btn-down" data-role="down">&#9660;</button>
            </div>
        `;
    },

    setupShutter3Way(container, dps) {
        if (!dps) return;
        container.querySelectorAll('.shutter-btn').forEach(btn => {
            btn.onclick = () => {
                const dpId = dps[btn.dataset.role];
                if (dpId) {
                    if (typeof window.API.setActorState === 'function') {
                        window.API.setActorState(dpId, true);
                    } else {
                        window.API.setActuatorState(dpId, true);
                    }
                }
            };
        });
    }
};