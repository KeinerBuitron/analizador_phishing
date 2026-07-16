// 1. Capturamos los elementos de la interfaz usando sus IDs de HTML
const emailInput = document.getElementById('email-input');
const botonAnalizar = document.getElementById('boton-analizar');
const lineaMedicion = document.getElementById('linea-medicion');
const resultadoTexto = document.getElementById('resultado-texto');

// 2. Escuchamos activamente cuando el usuario haga clic en el botón
botonAnalizar.addEventListener('click', () => {
    const textoCorreo = emailInput.value.trim();

    // Validación rápida: si no hay texto, avisamos al usuario
    if (textoCorreo === "") {
        resultadoTexto.textContent = "⚠️ Por favor, escribe o pega un correo para analizar.";
        lineaMedicion.style.width = "0%";
        lineaMedicion.style.backgroundColor = "var(--accent-indigo)";
        return;
    }

    // Cambiamos el estado del botón mientras se "procesa" el correo
    botonAnalizar.disabled = true;
    botonAnalizar.textContent = "Analizando...";
    resultadoTexto.textContent = "Procesando el texto con Random Forest Classifier...";

    // 3. SIMULACIÓN DE RESPUESTA (Prueba en navegador)
    // Simulamos un retraso de 1 segundo (como si fuera una petición real a Python)
    setTimeout(() => {
        // Generamos un porcentaje aleatorio para probar cómo se ve la animación
        const probabilidadSimulada = Math.floor(Math.random() * 101); // Número entre 0 y 100
        
        actualizarInterfaz(probabilidadSimulada);

        // Reactivamos el botón
        btnAnalizar.disabled = false;
        btnAnalizar.textContent = "Analizar Correo";
    }, 1000);
});

// 4. Función para actualizar la barra y los colores dinámicamente
function actualizarInterfaz(porcentaje) {
    // Ajustamos el ancho de la barra
    lineaMedicion.style.width = `${porcentaje}%`;

    // Cambiamos el color de fondo inyectando la variable CSS correspondiente
    if (porcentaje < 30) {
        // Riesgo Bajo -> Llama a la variable verde
        lineaMedicion.style.backgroundColor = "var(--verde)"; 
        resultadoTexto.innerHTML = `<strong>Seguro (${porcentaje}%)</strong>: No se detectaron anomalías severas.`;
    } else if (porcentaje >= 30 && porcentaje < 70) {
        // Riesgo Medio -> Llama a la variable amarilla
        lineaMedicion.style.backgroundColor = "var(--amarillo)"; 
        resultadoTexto.innerHTML = `<strong>Sospechoso (${porcentaje}%)</strong>: Revisa con atención los remitentes.`;
    } else {
        // Riesgo Alto -> Llama a la variable roja
        lineaMedicion.style.backgroundColor = "var(--rojo)"; 
        resultadoTexto.innerHTML = `<strong>⚠️ ALERTA DE PHISHING (${porcentaje}%)</strong>: Patrones de fraude detectados.`;
    }
}