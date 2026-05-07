// Variables globales para la simulación mejorada
let simulationInterval;
let currentDisplacement = 0;
let currentShearForce = 0;
let currentShearStress = 0;
let currentVerticalDeformation = 0;
let isSimulationRunning = false;
let isSimulationPaused = false;
let testData = {
    displacements: [],
    shearForces: []
};
let mohrData = [];

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráficos
    initCharts();
    
    // Configurar la simulación
    setupSimulation();
    
    // Configurar event listeners para controles
    setupControls();
});

// Inicializar gráficos
function initCharts() {
    // Gráfico de esfuerzo-deformación
    const chartCtx = document.getElementById('chartCanvas').getContext('2d');
    window.shearChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Esfuerzo de Corte (kPa)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Desplazamiento Horizontal (mm)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Esfuerzo de Corte (kPa)'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico de Mohr-Coulomb
    const mohrCtx = document.getElementById('mohrCanvas').getContext('2d');
    window.mohrChart = new Chart(mohrCtx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Envolvente de Falla',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                showLine: true,
                fill: false,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Esfuerzo Normal (kPa)'
                    },
                    min: 0,
                    max: 450
                },
                y: {
                    title: {
                        display: true,
                        text: 'Resistencia al Corte (kPa)'
                    },
                    min: 0,
                    max: 300
                }
            }
        }
    });
}


function getPreparationAdjustment() {
    try {
        const prepState = JSON.parse(localStorage.getItem('prepState') || 'null');
        if (!prepState || !prepState.compactionQuality) return { factor: 1, note: 'Sin preparatorio aplicado' };

        const q = prepState.compactionQuality;
        const factor = Math.max(0.7, Math.min(1.12, 0.82 + q * 0.4));
        return { factor, note: prepState.ready ? 'Preparación óptima aplicada' : 'Preparación parcial aplicada' };
    } catch (e) {
        return { factor: 1, note: 'Preparación no disponible' };
    }
}

// Configurar la simulación
function setupSimulation() {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (!window.animationId) drawInitialState();
    }
    
    // Variables de control específicas de HM-5750
    let soilType = 'sand';
    let cohesion = 0;
    let frictionAngle = 35;
    let normalStress = 100;
    let saturation = 'dry';
    let speed = 1.2;
    let prepAdjustment = getPreparationAdjustment();
    
    // Estado de la simulación
    window.animationId = null;
    let shearDisplacement = 0;
    let maxShearDisplacement = 25; // 25mm máximo
    let isPaused = false;
    let testData = {
        displacements: [],
        shearForces: []
    };
    
    // Elementos de la interfaz
    const soilTypeSelect = document.getElementById('soilType');
    const cohesionSlider = document.getElementById('cohesion');
    const frictionSlider = document.getElementById('friction');
    const normalStressSlider = document.getElementById('normalStress');
    const saturationSelect = document.getElementById('saturation');
    const speedSlider = document.getElementById('speed');
    
    const cohesionValue = document.getElementById('cohesionValue');
    const frictionValue = document.getElementById('frictionValue');
    const normalStressValue = document.getElementById('normalStressValue');
    const speedValue = document.getElementById('speedValue');
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    const shearStrengthElem = document.getElementById('shearStrength');
    const horizontalDeformationElem = document.getElementById('horizontalDeformation');
    const verticalDeformationElem = document.getElementById('verticalDeformation');
    const shearForceElem = document.getElementById('shearForce');
    
    // Inicializar valores
    updateSoilParameters();
    
    // Event listeners
    soilTypeSelect.addEventListener('change', function() {
        soilType = this.value;
        updateSoilParameters();
        if (!window.animationId) drawInitialState();
    });
    
    cohesionSlider.addEventListener('input', function() {
        cohesion = parseInt(this.value);
        cohesionValue.textContent = `${cohesion} kPa`;
        if (!window.animationId) drawInitialState();
    });
    
    frictionSlider.addEventListener('input', function() {
        frictionAngle = parseInt(this.value);
        frictionValue.textContent = `${frictionAngle}°`;
        if (!window.animationId) drawInitialState();
    });
    
    normalStressSlider.addEventListener('input', function() {
        normalStress = parseInt(this.value);
        normalStressValue.textContent = `${normalStress} kPa`;
        if (!window.animationId) drawInitialState();
    });
    
    saturationSelect.addEventListener('change', function() {
        saturation = this.value;
        if (!window.animationId) drawInitialState();
    });
    
    speedSlider.addEventListener('input', function() {
        speed = parseFloat(this.value);
        speedValue.textContent = `${speed} mm/min`;
    });
    
    startBtn.addEventListener('click', startTest);
    pauseBtn.addEventListener('click', pauseTest);
    resetBtn.addEventListener('click', resetTest);
    
    // Actualizar parámetros según tipo de suelo seleccionado
    function updateSoilParameters() {
        switch(soilType) {
            case 'sand':
                cohesion = 0;
                frictionAngle = 35;
                break;
            case 'clay':
                cohesion = 25;
                frictionAngle = 20;
                break;
            case 'silt':
                cohesion = 10;
                frictionAngle = 28;
                break;
            case 'clayeySand':
                cohesion = 15;
                frictionAngle = 30;
                break;
        }
        
        cohesionSlider.value = cohesion;
        frictionSlider.value = frictionAngle;
        
        cohesionValue.textContent = `${cohesion} kPa`;
        frictionValue.textContent = `${frictionAngle}°`;
    }
    
    // Dibujar estado inicial
    function drawInitialState() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte de la HM-5750
        const boxWidth = canvas.width * 0.7;
        const boxHeight = canvas.height * 0.4;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = canvas.height * 0.3;
        
        // Mitad inferior de la caja (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior de la caja
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight/2);
        
        // Línea de separación
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxHeight/2);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight/2);
        ctx.stroke();
        
        // Muestra de suelo
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth) / 2;
        const soilY = boxY + (boxHeight - soilHeight) / 2;
        
        ctx.fillStyle = getSoilColor();
        ctx.fillRect(soilX, soilY, soilWidth, soilHeight);
        
        // Dibujar tornillos rojos (medio giro)
        drawScrews(boxX, boxY, boxWidth, boxHeight);
        
        // Sistema de pesos muertos
        drawWeightsSystem(boxX, boxY, boxWidth);
        
        // Texto informativo
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.fillText('Muestra de suelo', soilX + 10, soilY + 20);
        ctx.fillText(`c = ${cohesion} kPa, φ = ${frictionAngle}°`, soilX + 10, soilY + 40);
        ctx.fillText(`σ = ${normalStress} kPa - ${saturation === 'saturated' ? 'Saturado' : 'Seco'}`, soilX + 10, soilY + 60);
        ctx.fillText(`${prepAdjustment.note} (x${prepAdjustment.factor.toFixed(2)})`, soilX + 10, soilY + 80);
        
        // Fuerza normal (aplicada por pesos)
        const arrowStartX = boxX + boxWidth/2;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, `σ = ${normalStress} kPa`);
    }
    
    function drawScrews(x, y, width, height) {
        // Dibujar tornillos rojos en las cuatro esquinas
        const screwRadius = 5;
        const positions = [
            {x: x + 20, y: y + height/2 - 10},
            {x: x + width - 20, y: y + height/2 - 10},
            {x: x + 20, y: y + height/2 + 10},
            {x: x + width - 20, y: y + height/2 + 10}
        ];
        
        ctx.fillStyle = '#e74c3c';
        positions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, screwRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Ranura del tornillo (medio giro)
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pos.x - screwRadius + 1, pos.y);
            ctx.lineTo(pos.x + screwRadius - 1, pos.y);
            ctx.stroke();
        });
    }
    
    function drawWeightsSystem(x, y, width) {
        // Dibujar el sistema de pesos muertos
        const systemWidth = 80;
        const systemHeight = 150;
        const systemX = x - systemWidth - 20;
        const systemY = y + 20;
        
        // Soporte
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(systemX, systemY, systemWidth, systemHeight);
        
        // Brazo de palanca
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(systemX + systemWidth/2 - 5, systemY, 10, 20);
        ctx.fillRect(systemX + systemWidth/2 - 40, systemY + 15, 80, 10);
        
        // Pesos (cantidad según esfuerzo normal)
        const weightCount = Math.min(Math.floor(normalStress / 50), 6);
        ctx.fillStyle = '#2c3e50';
        for (let i = 0; i < weightCount; i++) {
            ctx.fillRect(systemX + systemWidth/2 - 20, systemY + 25 + i*15, 40, 10);
        }
        
        // Indicador de carga
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.fillText(`${normalStress} kPa`, systemX, systemY - 10);
    }
    
    function getSoilColor() {
        // Color basado en tipo de suelo y saturación
        let color;
        
        switch(soilType) {
            case 'sand':
                color = saturation === 'saturated' ? '#D2B48C' : '#F4A460';
                break;
            case 'clay':
                color = saturation === 'saturated' ? '#8B4513' : '#A0522D';
                break;
            case 'silt':
                color = saturation === 'saturated' ? '#BC8F8F' : '#DEB887';
                break;
            case 'clayeySand':
                color = saturation === 'saturated' ? '#CD853F' : '#D2691E';
                break;
            default:
                color = '#F4A460';
        }
        
        return color;
    }
    
    function drawArrow(fromX, fromY, toX, toY, text) {
        const headlen = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Línea principal
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Punta de flecha
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI/6), toY - headlen * Math.sin(angle - Math.PI/6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI/6), toY - headlen * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        
        // Texto
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.fillText(text, fromX - 40, fromY - 10);
    }
    
    function startTest() {
        prepAdjustment = getPreparationAdjustment();
        if (window.animationId) {
            return; // Ya está en ejecución
        }
        
        if (isPaused) {
            // Reanudar prueba pausada
            isPaused = false;
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            animateTest();
            return;
        }
        
        // Iniciar nueva prueba
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        resetBtn.disabled = true;
        shearDisplacement = 0;
        testData = { displacements: [], shearForces: [] };
        window.shearChart.data.labels = [];
        window.shearChart.data.datasets[0].data = [];
        window.shearChart.update();
        
        // Actualizar gráfico de Mohr-Coulomb
        updateMohrChart();
        
        animateTest();
    }
    
    function pauseTest() {
        if (window.animationId) {
            cancelAnimationFrame(window.animationId);
            window.animationId = null;
            isPaused = true;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
        }
    }
    
    function resetTest() {
        if (window.animationId) {
            cancelAnimationFrame(window.animationId);
            window.animationId = null;
        }
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
        isPaused = false;
        
        shearDisplacement = 0;
        testData = { displacements: [], shearForces: [] };
        window.shearChart.data.labels = [];
        window.shearChart.data.datasets[0].data = [];
        window.shearChart.update();
        
        // Reiniciar resultados
        shearStrengthElem.textContent = '-';
        horizontalDeformationElem.textContent = '-';
        verticalDeformationElem.textContent = '-';
        shearForceElem.textContent = '-';
        
        drawInitialState();
    }
    
    function animateTest() {
        if (shearDisplacement >= maxShearDisplacement) {
            // Prueba completada
            cancelAnimationFrame(window.animationId);
            window.animationId = null;
            startBtn.disabled = true;
            pauseBtn.disabled = true;
            resetBtn.disabled = false;
            
            // Agregar punto a la envolvente de Mohr-Coulomb
            addMohrPoint(normalStress, calculateShearStrength());
            return;
        }
        
        // Avanzar según la velocidad (mm/frame)
        const speedFactor = speed / 60; // Convertir mm/min a mm/frame (60 FPS)
        shearDisplacement += speedFactor;
        shearDisplacement = Math.min(shearDisplacement, maxShearDisplacement);
        
        updateTest();
        window.animationId = requestAnimationFrame(animateTest);
    }
    
    function updateTest() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte
        const boxWidth = canvas.width * 0.7;
        const boxHeight = canvas.height * 0.4;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = canvas.height * 0.3;
        
        // Mitad inferior de la caja (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior de la caja (se mueve según el desplazamiento)
        const displacementPixels = (shearDisplacement / 25.4) * (boxWidth / 4); // Convertir mm a píxeles
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacementPixels, boxY, boxWidth, boxHeight/2);
        
        // Sistema de pesos muertos
        drawWeightsSystem(boxX, boxY, boxWidth);
        
        // Muestra de suelo deformada
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth) / 2;
        const soilY = boxY + (boxHeight - soilHeight) / 2;
        
        ctx.fillStyle = getSoilColor();
        ctx.fillRect(soilX, soilY, soilWidth, soilHeight);
        
        // Dibujar tornillos rojos
        drawScrews(boxX + displacementPixels, boxY, boxWidth, boxHeight);
        
        // Dibujar línea de falla
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(soilX, soilY + soilHeight/2);
        ctx.lineTo(soilX + displacementPixels, soilY + soilHeight/2);
        ctx.lineTo(soilX + soilWidth + displacementPixels, soilY + soilHeight/2);
        ctx.stroke();
        
        // Fuerza normal
        const arrowStartX = boxX + boxWidth/2 + displacementPixels;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, `σ = ${normalStress} kPa`);
        
        // Fuerza de corte
        const shearArrowX = boxX + boxWidth + 30;
        const shearArrowY = boxY + boxHeight/2;
        drawArrow(shearArrowX, shearArrowY, shearArrowX - 20, shearArrowY, 'τ');
        
        // Calcular y mostrar resultados
        const shearStrength = calculateShearStrength();
        
        // Calcular esfuerzo de corte actual (progresiva hasta alcanzar la resistencia máxima)
        const progress = shearDisplacement / (maxShearDisplacement / 2);
        const rawShear = progress < 1 ? 
            shearStrength * progress : 
            shearStrength * (1 - (progress - 1) * 0.2); // Reducción después del pico
        const currentShear = Number.isFinite(rawShear) ? Math.max(rawShear, 0) : 0;
        
        // Calcular deformación vertical (dilatancia/contracción)
        const verticalStrain = calculateVerticalStrain(shearDisplacement, frictionAngle, saturation);
        
        shearStrengthElem.textContent = shearStrength.toFixed(2);
        horizontalDeformationElem.textContent = shearDisplacement.toFixed(2);
        verticalDeformationElem.textContent = verticalStrain.toFixed(4);
        shearForceElem.textContent = (currentShear * 1000).toFixed(2); // Convertir a Newtons
        
        // Actualizar gráfico
        updateChart(shearDisplacement, currentShear);
    }
    
    function calculateShearStrength() {
        // Aplicar criterio de Mohr-Coulomb: τ = c + σ·tan(φ)
        const frictionRad = frictionAngle * Math.PI / 180;
        let strength = (cohesion + normalStress * Math.tan(frictionRad)) * prepAdjustment.factor;
        
        // Ajustar por saturación (suelos saturados tienen menor resistencia)
        if (saturation === 'saturated') {
            strength *= 0.7;
        }
        
        return strength;
    }
    
    function calculateVerticalStrain(horizontalDisp, frictionAngle, saturation) {
        // Simular el comportamiento de dilatancia/contracción del suelo
        // Suelos con mayor ángulo de fricción tienden a dilatarse más
        // Suelos saturados tienen menor dilatancia
        const peakDisp = maxShearDisplacement / 2;
        const progress = horizontalDisp / peakDisp;
        
        const saturationFactor = saturation === 'saturated' ? 0.7 : 1;
        const frictionFactor = frictionAngle / 45;
        
        if (progress < 1) {
            // Fase pre-pico: ligera contracción seguida de dilatación
            return (-0.1 * saturationFactor) + (frictionFactor * progress * 0.5);
        } else {
            // Fase post-pico: mantenimiento o ligera reducción de la dilatación
            return ((-0.1 * saturationFactor) + (frictionFactor * 0.5)) * (1 - (progress - 1) * 0.1);
        }
    }
    
    function updateChart(displacement, stress) {
        if (!Number.isFinite(displacement) || !Number.isFinite(stress)) {
            return;
        }

        testData.displacements.push(displacement);
        testData.shearForces.push(stress);

        // Mantener un histórico acotado evita artefactos visuales de escalado
        if (testData.displacements.length > 500) {
            testData.displacements.shift();
            testData.shearForces.shift();
        }
        
        window.shearChart.data.labels = testData.displacements;
        window.shearChart.data.datasets[0].data = testData.shearForces;
        window.shearChart.update();
    }
    
    function updateMohrChart() {
        // Calcular la envolvente de falla basada en los parámetros actuales
        const frictionRad = frictionAngle * Math.PI / 180;
        const data = [
            {x: 0, y: cohesion * prepAdjustment.factor},
            {x: 100, y: (cohesion + 100 * Math.tan(frictionRad)) * prepAdjustment.factor},
            {x: 200, y: (cohesion + 200 * Math.tan(frictionRad)) * prepAdjustment.factor},
            {x: 300, y: (cohesion + 300 * Math.tan(frictionRad)) * prepAdjustment.factor},
            {x: 400, y: (cohesion + 400 * Math.tan(frictionRad)) * prepAdjustment.factor}
        ];
        
        window.mohrChart.data.datasets[0].data = data;
        window.mohrChart.update();
    }
    
    function addMohrPoint(normalStress, shearStress) {
        // Agregar un punto de falla a la envolvente
        if (!window.mohrChart.data.datasets[1]) {
            window.mohrChart.data.datasets.push({
                label: 'Puntos de Falla',
                data: [],
                backgroundColor: 'rgb(54, 162, 235)',
                pointRadius: 6
            });
        }
        
        window.mohrChart.data.datasets[1].data.push({
            x: normalStress,
            y: shearStress
        });
        
        window.mohrChart.update();
    }
    
    // Inicializar
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawInitialState();
    updateMohrChart();
}

// Configurar controles
function setupControls() {
    // Los controles ya están configurados en setupSimulation()
}
