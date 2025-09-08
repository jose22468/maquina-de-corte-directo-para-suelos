// Función para mostrar secciones
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');
}

// Inicializar gráficos
function initCharts() {
    // Gráfico de esfuerzo-deformación
    const chartCtx = document.getElementById('chartCanvas').getContext('2d');
    window.shearChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Fuerza de Corte (N)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Deformación Horizontal (mm)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Fuerza de Corte (N)'
                    }
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
                data: [
                    {x: 100, y: 75},
                    {x: 200, y: 130},
                    {x: 300, y: 185}
                ],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                showLine: true,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Esfuerzo Normal (kPa)'
                    },
                    min: 0,
                    max: 350
                },
                y: {
                    title: {
                        display: true,
                        text: 'Resistencia al Corte (kPa)'
                    },
                    min: 0,
                    max: 200
                }
            }
        }
    });
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
    let cohesion = 10;
    let frictionAngle = 30;
    let normalStress = 200;
    let saturation = 'unsat';
    
    // Estado de la simulación
    window.animationId = null;
    let shearDisplacement = 0;
    let maxShearDisplacement = 300;
    let isPaused = false;
    let testData = {
        displacements: [],
        shearForces: []
    };
    
    // Elementos de la interfaz
    const cohesionSlider = document.getElementById('cohesion');
    const frictionSlider = document.getElementById('friction');
    const normalStressSlider = document.getElementById('normalStress');
    const saturationSelect = document.getElementById('saturation');
    
    const cohesionValue = document.getElementById('cohesionValue');
    const frictionValue = document.getElementById('frictionValue');
    const normalStressValue = document.getElementById('normalStressValue');
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    const shearStrengthElem = document.getElementById('shearStrength');
    const horizontalDeformationElem = document.getElementById('horizontalDeformation');
    const verticalDeformationElem = document.getElementById('verticalDeformation');
    const shearForceElem = document.getElementById('shearForce');
    
    // Inicializar valores
    cohesionSlider.value = cohesion;
    frictionSlider.value = frictionAngle;
    normalStressSlider.value = normalStress;
    saturationSelect.value = saturation;
    
    cohesionValue.textContent = `${cohesion} kPa`;
    frictionValue.textContent = `${frictionAngle}°`;
    normalStressValue.textContent = `${normalStress} kPa`;
    
    // Event listeners
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
    
    startBtn.addEventListener('click', startTest);
    pauseBtn.addEventListener('click', pauseTest);
    resetBtn.addEventListener('click', resetTest);
    
    // Dibujar estado inicial
    function drawInitialState() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte de la HM-5750
        const boxWidth = canvas.width * 0.8;
        const boxHeight = canvas.height * 0.5;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        
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
        drawWeightsSystem(boxX, boxY);
        
        // Texto informativo
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.fillText('Muestra de suelo', soilX + 10, soilY + 20);
        ctx.fillText(`c = ${cohesion} kPa, φ = ${frictionAngle}°`, soilX + 10, soilY + 40);
        ctx.fillText(`σ = ${normalStress} kPa - ${saturation === 'sat' ? 'Saturado' : 'No Saturado'}`, soilX + 10, soilY + 60);
        
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
    
    function drawWeightsSystem(x, y) {
        // Dibujar el sistema de pesos muertos
        const systemWidth = 80;
        const systemHeight = 120;
        const systemX = x - systemWidth - 20;
        const systemY = y + 20;
        
        // Soporte
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(systemX, systemY, systemWidth, systemHeight);
        
        // Brazo de palanca
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(systemX + systemWidth/2 - 5, systemY, 10, 20);
        ctx.fillRect(systemX + systemWidth/2 - 40, systemY + 15, 80, 10);
        
        // Pesos
        ctx.fillStyle = '#2c3e50';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(systemX + systemWidth/2 - 20, systemY + 25 + i*15, 40, 10);
        }
        
        // Indicador de carga
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.fillText(`${normalStress} kPa`, systemX, systemY - 10);
    }
    
    function getSoilColor() {
        // Color basado en parámetros del suelo y saturación
        let r, g, b;
        
        if (saturation === 'sat') {
            // Suelo saturado - tonos más oscuros
            r = 70 + cohesion * 2;
            g = 40 + frictionAngle * 2;
            b = 20;
        } else {
            // Suelo no saturado - tonos más claros
            r = 139 + cohesion * 2;
            g = 69 + frictionAngle * 2;
            b = 19;
        }
        
        return `rgb(${r}, ${g}, ${b})`;
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
        
        animateTest();
    }
    
    function pauseTest() {
        if (window.animationId) {
            cancelAnimationFrame(window.animationId);
            window.animationId = null;
            isPaused = true;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            startBtn.textContent = "Reanudar";
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
        startBtn.textContent = "Iniciar Ensayo";
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
            return;
        }
        
        // Avanzar según la velocidad fija (mm/frame)
        shearDisplacement += 0.5;
        
        updateTest();
        window.animationId = requestAnimationFrame(animateTest);
    }
    
    function updateTest() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte
        const boxWidth = canvas.width * 0.8;
        const boxHeight = canvas.height * 0.5;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        
        // Mitad inferior de la caja (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior de la caja (se mueve según el desplazamiento)
        const displacementPixels = (shearDisplacement / 25.4) * (boxWidth / 4); // Convertir mm a píxeles
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacementPixels, boxY, boxWidth, boxHeight/2);
        
        // Sistema de pesos muertos
        drawWeightsSystem(boxX, boxY);
        
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
        const frictionRad = frictionAngle * Math.PI / 180;
        const shearStrength = cohesion + normalStress * Math.tan(frictionRad);
        
        // Calcular fuerza de corte actual (progresiva hasta alcanzar la resistencia máxima)
        const progress = shearDisplacement / (maxShearDisplacement / 2);
        const currentShear = progress < 1 ? 
            shearStrength * progress : 
            shearStrength * (1 - (progress - 1) * 0.2); // Reducción después del pico
        
        // Calcular deformación vertical (dilatancia/contracción)
        const verticalStrain = calculateVerticalStrain(shearDisplacement, frictionAngle, saturation);
        
        shearStrengthElem.textContent = shearStrength.toFixed(2);
        horizontalDeformationElem.textContent = shearDisplacement.toFixed(2);
        verticalDeformationElem.textContent = verticalStrain.toFixed(4);
        shearForceElem.textContent = (currentShear * 1000).toFixed(2); // Convertir a Newtons
        
        // Actualizar gráfico
        updateChart(shearDisplacement, currentShear * 1000);
    }
    
    function calculateVerticalStrain(horizontalDisp, frictionAngle, saturation) {
        // Simular el comportamiento de dilatancia/contracción del suelo
        // Suelos con mayor ángulo de fricción tienden a dilatarse más
        // Suelos saturados tienen menor dilatancia
        const peakDisp = maxShearDisplacement / 2;
        const progress = horizontalDisp / peakDisp;
        
        const saturationFactor = saturation === 'sat' ? 0.7 : 1;
        
        if (progress < 1) {
            // Fase pre-pico: ligera contracción seguida de dilatación
            return (-0.1 * saturationFactor) + (frictionAngle / 45) * progress * 0.5;
        } else {
            // Fase post-pico: mantenimiento o ligera reducción de la dilatación
            return ((-0.1 * saturationFactor) + (frictionAngle / 45) * 0.5) * (1 - (progress - 1) * 0.1);
        }
    }
    
    function updateChart(displacement, force) {
        testData.displacements.push(displacement);
        testData.shearForces.push(force);
        
        window.shearChart.data.labels = testData.displacements;
        window.shearChart.data.datasets[0].data = testData.shearForces;
        window.shearChart.update();
    }
    
    // Inicializar
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawInitialState();
}

// Inicializar la simulación cuando se cargue la página
document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    setupSimulation();
});
