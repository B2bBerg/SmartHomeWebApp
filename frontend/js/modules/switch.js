/**
 * Switch & Control Module for SmartHome Tiles
 */
const SwitchRenderer = {
    // Rendert das passende Control in den Container
    render(container, type) {
        if (type === 'switch-light') {
            this.renderToggle(container);
        } else if (type === 'switch-shutter') {
            this.renderShutter(container);
        }
        this.setupEvents(container, type);
    },

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

    renderShutter(container) {
        container.innerHTML = `
            <div class="shutter-container">
                <button class="shutter-btn btn-up" data-action="up">
                    &#9650;
                </button>
                <button class="shutter-btn btn-stop" data-action="stop">
                    <div class="stop-icon"></div>
                </button>
                <button class="shutter-btn btn-down" data-action="down">
                    &#9660;
                </button>
            </div>
        `;
    },

    setupEvents(container, type) {
        const tile = container.closest('.dynamic-tile');
        const datapoint = tile?.dataset.datapoint;

        if (type === 'switch-light') {
            const input = container.querySelector('.switch-input');
            const statusText = container.querySelector('.switch-status');
            
            input.onchange = (e) => {
                const newState = e.target.checked;
                statusText.textContent = newState ? 'AN' : 'AUS';
                window.API.setActuatorState(datapoint, newState);
            };
        } else if (type === 'switch-shutter') {
            container.querySelectorAll('.shutter-btn').forEach(btn => {
                btn.onclick = () => {
                    const action = btn.dataset.action;
                    window.API.setActuatorState(datapoint, action);
                };
            });
        }
    }
};