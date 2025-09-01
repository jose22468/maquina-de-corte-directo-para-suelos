document.addEventListener('DOMContentLoaded', function() {
    // Canvas elements
    const canvas = document.getElementById('simulationCanvas');
    const chartCanvas = document.getElementById('chartCanvas');
    const ctx = canvas.getContext('2d');
    
    // Chart initialization
    let shearChart;
    initChart();
    
    // Variables de control específicas de HM-5755
    let cohesion = 10;
    let frictionAngle = 30;
    let normalStress = 200;
    let shearSpeed = 1.20; // mm/min
    let airPressure = 70; // psi
    let valveOpen = false;
    
    // Estado de la simulación
    let animationId = null;
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
    const speedSlider = document.getElementById('speed');
    const pressureSlider = document.getElementById('pressureInput');
    const toggleValveBtn = document.getElementById('toggleValve');
    
    const cohesionValue = document.getElementById('cohesionValue');
    const frictionValue = document.getElementById('frictionValue');
    const normalStressValue = document.getElementById('normalStressValue');
    const speedValue = document.getElementById('speedValue');
    const pressureValue = document.getElementById('pressureValue');
    const valveStatus = document.getElementById('valveStatus');
    
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
    speedSlider.value = shearSpeed;
    pressureSlider.value = airPressure;
    
    cohesionValue.textContent = `${cohesion} kPa`;
    frictionValue.textContent = `${frictionAngle}°`;
    normalStressValue.textContent = `${normalStress} kPa`;
    speedValue.textContent = `${shearSpeed.toFixed(2)} mm/min`;
    pressureValue.textContent = `${airPressure} psi`;
    
    // Event listeners
    cohesionSlider.addEventListener('input', function() {
        cohesion = parseInt(this.value);
        cohesionValue.textContent = `${cohesion} kPa`;
        if (!animationId) drawInitialState();
    });
    
    frictionSlider.addEventListener('input', function() {
        frictionAngle = parseInt(this.value);
        frictionValue.textContent = `${frictionAngle}°`;
        if (!animationId) drawInitialState();
    });
    
    normalStressSlider.addEventListener('input', function() {
        normalStress = parseInt(this.value);
        normalStressValue.textContent = `${normalStress} kPa`;
        if (!animationId) drawInitialState();
    });
    
    speedSlider.addEventListener('input', function() {
        shearSpeed = parseFloat(this.value);
        speedValue.textContent = `${shearSpeed.toFixed(2)} mm/min`;
    });
    
    pressureSlider.addEventListener('input', function() {
        airPressure = parseInt(this.value);
        pressureValue.textContent = `${airPressure} psi`;
        updateNormalLoad();
    });
    
    toggleValveBtn.addEventListener('click', function() {
        valveOpen = !valveOpen;
        updateValveStatus();
        updateNormalLoad();
    });
    
    startBtn.addEventListener('click', startTest);
    pauseBtn.addEventListener('click', pauseTest);
    resetBtn.addEventListener('click', resetTest);
    
    // Inicializar
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawInitialState();
    
    // Funciones específicas de la HM-5755
    function updateValveStatus() {
        if (valveOpen) {
            valveStatus.textContent = "Válvula Abierta";
            valveStatus.classList.add('open');
            toggleValveBtn.textContent = "Cerrar Válvula";
        } else {
            valveStatus.textContent = "Válvula Cerrada";
            valveStatus.classList.remove('open');
            toggleValveBtn.textContent = "Abrir Válvula";
        }
    }
    
    function updateNormalLoad() {
        // En la HM-5755, la carga normal se controla mediante presión neumática
        // La carga aplicada es proporcional a la presión de aire cuando la válvula está abierta
        if (valveOpen) {
            // Simular la relación entre presión de aire y carga normal
            const calculatedLoad = airPressure * 20; // 20 kPa por psi (simulación)
            normalStressSlider.value = Math.min(calculatedLoad, 500);
            normalStress = parseInt(normalStressSlider.value);
            normalStressValue.textContent = `${normalStress} kPa`;
        }
        
        if (!animationId) drawInitialState();
    }
    
    function initChart() {
        const ctx = chartCanvas.getContext('2d');
        shearChart = new Chart(ctx, {
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
    }
    
    function updateChart(displacement, force) {
        testData.displacements.push(displacement);
        testData.shearForces.push(force);
        
        shearChart.data.labels = testData.displacements;
        shearChart.data.datasets[0].data = testData.shearForces;
        shearChart.update();
    }
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (!animationId) drawInitialState();
        
        // También ajustar el canvas del gráfico
        const chartContainer = chartCanvas.parentElement;
        chartCanvas.width = chartContainer.clientWidth;
    }
    
    function drawInitialState() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte de la HM-5755
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
        
        // Sistema neumático (representación simplificada)
        drawPneumaticSystem(boxX, boxY);
        
        // Texto informativo
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.fillText('Muestra de suelo', soilX + 10, soilY + 20);
        ctx.fillText(`c = ${cohesion} kPa, φ = ${frictionAngle}°`, soilX + 10, soilY + 40);
        ctx.fillText(`σ = ${normalStress} kPa`, soilX + 10, soilY + 60);
        
        // Fuerza normal (aplicada neumáticamente)
        const arrowStartX = boxX + boxWidth/2;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, `σ = ${normalStress} kPa`);
    }
    
    function drawPneumaticSystem(x, y) {
        // Dibujar representación simplificada del sistema neumático
        const systemWidth = 100;
        const systemHeight = 60;
        const systemX = x - systemWidth - 20;
        const systemY = y + 50;
        
        // Cilindro neumático
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(systemX, systemY, systemWidth, systemHeight);
        
        // Pistón
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(systemX + systemWidth - 20, systemY, 20, systemHeight);
        
        // Conexión de aire
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(systemX - 30, systemY + systemHeight/2);
        ctx.lineTo(systemX, systemY + systemHeight/2);
        ctx.stroke();
        
        // Válvula (indicador de estado)
        ctx.fillStyle = valveOpen ? '#2ecc71' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(systemX - 15, systemY + systemHeight/2, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Indicador de presión
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.fillText(`${airPressure} psi`, systemX, systemY - 10);
    }
    
    function getSoilColor() {
        // Color basado en parámetros del suelo
        const r = 139 + cohesion * 2;
        const g = 69 + frictionAngle * 2;
        const b = 19;
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
        if (animationId) {
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
        shearChart.data.labels = [];
        shearChart.data.datasets[0].data = [];
        shearChart.update();
        
        // Verificar que la válvula esté abierta para aplicar carga normal
        if (!valveOpen) {
            alert("Para iniciar el ensayo, debe abrir la válvula neumática para aplicar carga normal.");
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            return;
        }
        
        animateTest();
    }
    
    function pauseTest() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            isPaused = true;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            startBtn.textContent = "Reanudar";
        }
    }
    
    function resetTest() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
        startBtn.textContent = "Iniciar Ensayo";
        isPaused = false;
        
        shearDisplacement = 0;
        testData = { displacements: [], shearForces: [] };
        shearChart.data.labels = [];
        shearChart.data.datasets[0].data = [];
        shearChart.update();
        
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
            cancelAnimationFrame(animationId);
            animationId = null;
            startBtn.disabled = true;
            pauseBtn.disabled = true;
            resetBtn.disabled = false;
            return;
        }
        
        // Avanzar según la velocidad configurada (mm/min)
        // Convertir a píxeles/Frame considerando 60 FPS
        const speedFactor = shearSpeed / 60; // mm/frame
        shearDisplacement += speedFactor;
        
        updateTest();
        animationId = requestAnimationFrame(animateTest);
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
        
        // Sistema neumático
        drawPneumaticSystem(boxX, boxY);
        
        // Muestra de suelo deformada
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth) / 2;
        const soilY = boxY + (boxHeight - soilHeight) / 2;
        
        ctx.fillStyle = getSoilColor();
        ctx.fillRect(soilX, soilY, soilWidth, soilHeight);
        
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
        const verticalStrain = calculateVerticalStrain(shearDisplacement, frictionAngle);
        
        shearStrengthElem.textContent = shearStrength.toFixed(2);
        horizontalDeformationElem.textContent = shearDisplacement.toFixed(2);
        verticalDeformationElem.textContent = verticalStrain.toFixed(4);
        shearForceElem.textContent = (currentShear * 1000).toFixed(2); // Convertir a Newtons
        
        // Actualizar gráfico
        updateChart(shearDisplacement, currentShear * 1000);
    }
    
    function calculateVerticalStrain(horizontalDisp, frictionAngle) {
        // Simular el comportamiento de dilatancia/contracción del suelo
        // Suelos con mayor ángulo de fricción tienden a dilatarse más
        const peakDisp = maxShearDisplacement / 2;
        const progress = horizontalDisp / peakDisp;
        
        if (progress < 1) {
            // Fase pre-pico: ligera contracción seguida de dilatación
            return -0.1 + (frictionAngle / 45) * progress * 0.5;
        } else {
            // Fase post-pico: mantenimiento o ligera reducción de la dilatación
            return (-0.1 + (frictionAngle / 45) * 0.5) * (1 - (progress - 1) * 0.1);
        }
    }
});
