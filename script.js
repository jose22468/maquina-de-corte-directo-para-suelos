document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawInitialState();
    }
    
    // Variables de control
    let cohesion = 10;
    let frictionAngle = 30;
    let normalStress = 200;
    let animationId = null;
    let shearDisplacement = 0;
    let maxShearDisplacement = 300;
    
    // Elementos de la interfaz
    const cohesionSlider = document.getElementById('cohesion');
    const frictionSlider = document.getElementById('friction');
    const normalStressSlider = document.getElementById('normalStress');
    const cohesionValue = document.getElementById('cohesionValue');
    const frictionValue = document.getElementById('frictionValue');
    const normalStressValue = document.getElementById('normalStressValue');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const shearStrengthElem = document.getElementById('shearStrength');
    const horizontalDeformationElem = document.getElementById('horizontalDeformation');
    const shearForceElem = document.getElementById('shearForce');
    
    // Inicializar valores
    cohesionSlider.value = cohesion;
    frictionSlider.value = frictionAngle;
    normalStressSlider.value = normalStress;
    cohesionValue.textContent = `${cohesion} kPa`;
    frictionValue.textContent = `${frictionAngle}°`;
    normalStressValue.textContent = `${normalStress} kPa`;
    
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
    
    startBtn.addEventListener('click', startSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    
    // Dibujar estado inicial
    function drawInitialState() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte
        const boxWidth = canvas.width * 0.8;
        const boxHeight = canvas.height * 0.5;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        
        // Mitad inferior de la caja
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
        
        // Texto
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.fillText('Muestra de suelo', soilX + 10, soilY + 20);
        ctx.fillText(`c = ${cohesion} kPa, φ = ${frictionAngle}°`, soilX + 10, soilY + 40);
        
        // Fuerza normal
        const arrowStartX = boxX + boxWidth/2;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, 'σ = ' + normalStress + ' kPa');
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
    
    function startSimulation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            startBtn.textContent = 'Continuar';
            return;
        }
        
        startBtn.textContent = 'Pausar';
        shearDisplacement = 0;
        
        function animate() {
            if (shearDisplacement >= maxShearDisplacement) {
                cancelAnimationFrame(animationId);
                animationId = null;
                startBtn.textContent = 'Iniciar Ensayo';
                return;
            }
            
            shearDisplacement += 2;
            updateSimulation();
            animationId = requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    function updateSimulation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte
        const boxWidth = canvas.width * 0.8;
        const boxHeight = canvas.height * 0.5;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        
        // Mitad inferior de la caja (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior de la caja (se mueve)
        const displacement = shearDisplacement / 10;
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacement, boxY, boxWidth, boxHeight/2);
        
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
        ctx.lineTo(soilX + displacement, soilY + soilHeight/2);
        ctx.lineTo(soilX + soilWidth + displacement, soilY + soilHeight/2);
        ctx.stroke();
        
        // Fuerza normal
        const arrowStartX = boxX + boxWidth/2 + displacement;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, 'σ = ' + normalStress + ' kPa');
        
        // Fuerza de corte
        const shearArrowX = boxX + boxWidth + 30;
        const shearArrowY = boxY + boxHeight/2;
        drawArrow(shearArrowX, shearArrowY, shearArrowX - 20, shearArrowY, 'τ');
        
        // Calcular y mostrar resultados
        const frictionRad = frictionAngle * Math.PI / 180;
        const shearStrength = cohesion + normalStress * Math.tan(frictionRad);
        const currentShear = shearStrength * (shearDisplacement / maxShearDisplacement);
        
        shearStrengthElem.textContent = shearStrength.toFixed(2);
        horizontalDeformationElem.textContent = (displacement).toFixed(2);
        shearForceElem.textContent = (currentShear * 1000).toFixed(2); // Convertir a Newtons
    }
    
    function resetSimulation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        startBtn.textContent = 'Iniciar Ensayo';
        shearDisplacement = 0;
        drawInitialState();
        
        // Reiniciar resultados
        shearStrengthElem.textContent = '-';
        horizontalDeformationElem.textContent = '-';
        shearForceElem.textContent = '-';
    }
    
    // Inicializar
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
});
