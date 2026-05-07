document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('prepCanvas');
    const ctx = canvas.getContext('2d');

    const soilType = document.getElementById('prepSoilType');
    const force = document.getElementById('compactionForce');
    const blows = document.getElementById('numBlows');
    const moisture = document.getElementById('moisture');
    const layers = document.getElementById('layers');

    const forceValue = document.getElementById('compactionForceValue');
    const blowsValue = document.getElementById('numBlowsValue');
    const moistureValue = document.getElementById('moistureValue');
    const layersValue = document.getElementById('layersValue');

    const startBtn = document.getElementById('prepStartBtn');
    const pauseBtn = document.getElementById('prepPauseBtn');
    const resetBtn = document.getElementById('prepResetBtn');

    const densityEl = document.getElementById('prepDensity');
    const qualityEl = document.getElementById('prepQuality');
    const stateEl = document.getElementById('prepState');

    let progress = 0;
    let running = false;
    let interval;

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 330;
        draw();
    }

    function getSoilColor() {
        return {
            sand: '#F4A460',
            clay: '#A0522D',
            silt: '#DEB887',
            clayeySand: '#D2691E'
        }[soilType.value];
    }

    function compactionIndex() {
        const f = Number(force.value);
        const b = Number(blows.value);
        const m = Number(moisture.value);
        const l = Number(layers.value);

        const optMoisture = soilType.value === 'clay' ? 18 : soilType.value === 'silt' ? 16 : 12;
        const moistPenalty = Math.max(0, 1 - Math.abs(m - optMoisture) / 14);
        return Math.min(1, (f / 80) * 0.35 + (b / 60) * 0.35 + (l / 5) * 0.15 + moistPenalty * 0.15);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const moldY = 190;
        const radius = 95;
        const pistonBase = 70 + (1 - Math.sin(progress * Math.PI * 2)) * 40;

        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(cx - 26, 20, 52, pistonBase);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(cx - 70, pistonBase - 10, 140, 20);

        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, moldY, radius, 0, Math.PI * 2);
        ctx.stroke();

        const idx = compactionIndex();
        const fillHeight = 120 - idx * 40 - progress * 10;

        ctx.fillStyle = getSoilColor();
        ctx.beginPath();
        ctx.arc(cx, moldY, radius - 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let i = 0; i < 30 - Math.round(idx * 16); i++) {
            const x = cx - 70 + Math.random() * 140;
            const y = moldY - 50 + Math.random() * fillHeight;
            ctx.fillRect(x, y, 3, 3);
        }

        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.fillText(`Fuerza: ${force.value} kN`, 20, 25);
        ctx.fillText(`Golpes: ${blows.value}`, 20, 45);
        ctx.fillText(`Humedad: ${moisture.value}%`, 20, 65);
    }

    function savePreparationState() {
        const quality = compactionIndex();
        const density = 65 + quality * 35;
        const isReady = quality >= 0.72;

        densityEl.textContent = density.toFixed(1);
        qualityEl.textContent = quality.toFixed(2);
        stateEl.textContent = isReady ? 'Lista para ensayo' : 'Requiere ajuste';

        localStorage.setItem('prepState', JSON.stringify({
            timestamp: new Date().toISOString(),
            soilType: soilType.value,
            compactionQuality: quality,
            density,
            ready: isReady,
            params: {
                force: Number(force.value),
                blows: Number(blows.value),
                moisture: Number(moisture.value),
                layers: Number(layers.value)
            }
        }));
    }

    function tick() {
        progress += 0.05;
        if (progress >= 1) {
            progress = 0;
            savePreparationState();
        }
        draw();
    }

    [force, blows, moisture, layers].forEach(input => {
        input.addEventListener('input', () => {
            forceValue.textContent = `${force.value} kN`;
            blowsValue.textContent = blows.value;
            moistureValue.textContent = `${moisture.value} %`;
            layersValue.textContent = layers.value;
            draw();
            savePreparationState();
        });
    });

    soilType.addEventListener('change', () => {
        draw();
        savePreparationState();
    });

    startBtn.addEventListener('click', () => {
        if (running) return;
        running = true;
        interval = setInterval(tick, 120);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
    });

    pauseBtn.addEventListener('click', () => {
        running = false;
        clearInterval(interval);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    });

    resetBtn.addEventListener('click', () => {
        running = false;
        clearInterval(interval);
        progress = 0;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        localStorage.removeItem('prepState');
        densityEl.textContent = '-';
        qualityEl.textContent = '-';
        stateEl.textContent = 'Sin preparar';
        draw();
    });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    savePreparationState();
});
