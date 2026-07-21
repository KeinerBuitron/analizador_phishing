// 1. Capturamos los elementos de la interfaz usando sus IDs de HTML
const emailInput = document.getElementById('email-input');
const botonAnalizar = document.getElementById('boton-analizar');
const botonLimpiar = document.getElementById('boton-limpiar');
const contenedorResultados = document.getElementById('contenedor-resultados');
const lineaMedicion = document.getElementById('linea-medicion');
const resultadoTexto = document.getElementById('resultado-texto');
const porcentajeTexto = document.getElementById('porcentaje-texto');
const badgeEstado = document.getElementById('badge-estado');

// Captura de los nuevos botones de retroalimentación
const btnCorrecta = document.getElementById('btn-correcta');
const btnFalsoSeguro = document.getElementById('btn-falso-seguro');
const btnFalsoAlarma = document.getElementById('btn-falso-alarma');

// Captura de elementos del Módulo de Aprendizaje Continuo
const feedbackCount = document.getElementById('feedback-count');
const btnRetrain = document.getElementById('btn-retrain');

// 2. Escuchamos activamente cuando el usuario haga clic en el botón Analizar
botonAnalizar.addEventListener('click', async () => {
    const textoCorreo = emailInput.value.trim();

    // Validación rápida: si no hay texto, avisamos al usuario
    if (textoCorreo === "") {
        resultadoTexto.textContent = "⚠️ Por favor, escribe o pega un correo para analizar.";
        lineaMedicion.style.width = "0%";
        lineaMedicion.style.backgroundColor = "var(--accent-indigo)";
        return;
    }

    // Cambiamos el estado del botón mientras se procesa la petición real
    botonAnalizar.disabled = true;
    botonAnalizar.textContent = "Analizando...";
    resultadoTexto.textContent = "Procesando el texto con Random Forest Classifier...";

    try {
        // 3. PETICIÓN REAL A TU BACKEND FASTAPI
        const respuesta = await fetch('http://127.0.0.1:8000/prediccion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texto: textoCorreo
            })
        });

        if (!respuesta.ok) {
            throw new Error('Error en la respuesta del servidor de FastAPI');
        }

        const datos = await respuesta.json();

        // 4. PROCESAR LOS DATOS DE MACHINE LEARNING
        const porcentajeReal = Math.round(datos.probabilidad_phishing * 100);

        // Mostramos el contenedor de resultados y actualizamos la UI
        if (contenedorResultados) contenedorResultados.style.display = "block";
        actualizarInterfaz(porcentajeReal);

        // Habilitamos los tres botones de retroalimentación para este correo
        toggleBotonesFeedback(false);

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        resultadoTexto.innerHTML = `<strong>⚠️ Error de conexión:</strong> No se pudo conectar con el servidor de análisis. Asegúrate de que Python esté corriendo.`;
        lineaMedicion.style.width = "0%";
    } finally {
        botonAnalizar.disabled = false;
        botonAnalizar.textContent = "Analizar Correo";
    }
});

// 3. Función para actualizar la barra, textos y colores
function actualizarInterfaz(porcentaje) {
    lineaMedicion.style.width = `${porcentaje}%`;
    if (porcentajeTexto) porcentajeTexto.textContent = `${porcentaje}%`;

    if (porcentaje < 30) {
        lineaMedicion.style.backgroundColor = "var(--verde)"; 
        resultadoTexto.innerHTML = `<strong>Seguro (${porcentaje}%)</strong>: No se detectaron anomalías severas.`;
        if (badgeEstado) {
            badgeEstado.textContent = "SEGURO";
            badgeEstado.style.backgroundColor = "#10b981";
        }
    } else if (porcentaje >= 30 && porcentaje < 70) {
        lineaMedicion.style.backgroundColor = "var(--amarillo)"; 
        resultadoTexto.innerHTML = `<strong>Sospechoso (${porcentaje}%)</strong>: Revisa con atención los remitentes.`;
        if (badgeEstado) {
            badgeEstado.textContent = "SOSPECHOSO";
            badgeEstado.style.backgroundColor = "#f59e0b";
        }
    } else {
        lineaMedicion.style.backgroundColor = "var(--rojo)"; 
        resultadoTexto.innerHTML = `<strong>⚠️ ALERTA DE PHISHING (${porcentaje}%)</strong>: Patrones de fraude detectados.`;
        if (badgeEstado) {
            badgeEstado.textContent = "ALERTA DE PHISHING";
            badgeEstado.style.backgroundColor = "#ef4444";
        }
    }
}

// 4. PROCESAR RETROALIMENTACIÓN HUMANA (FEEDBACK)
async function enviarFeedback(tipoFeedback) {
    try {
        const respuesta = await fetch('http://127.0.0.1:8000/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo_feedback: tipoFeedback })
        });

        const datos = await respuesta.json();

        if (datos.status === "success") {
            // Actualizamos el número de muestras recolectadas
            feedbackCount.textContent = datos.total_feedback;

            // Bloqueamos los botones de calificación para no enviar doble feedback del mismo correo
            toggleBotonesFeedback(true);

            // Si llegamos a 5 muestras, activamos el botón de re-entrenamiento
            if (datos.total_feedback >= 5) {
                btnRetrain.disabled = false;
                btnRetrain.style.opacity = "1";
                btnRetrain.style.cursor = "pointer";
            }
        }
    } catch (error) {
        console.error("Error al enviar el feedback:", error);
    }
}

// Escuchadores de eventos para los tres botones de calificación
if (btnCorrecta) btnCorrecta.addEventListener('click', () => enviarFeedback('correcta'));
if (btnFalsoSeguro) btnFalsoSeguro.addEventListener('click', () => enviarFeedback('falso_seguro'));
if (btnFalsoAlarma) btnFalsoAlarma.addEventListener('click', () => enviarFeedback('falso_alarma'));

function toggleBotonesFeedback(deshabilitar) {
    if (btnCorrecta) btnCorrecta.disabled = deshabilitar;
    if (btnFalsoSeguro) btnFalsoSeguro.disabled = deshabilitar;
    if (btnFalsoAlarma) btnFalsoAlarma.disabled = deshabilitar;

    const opacidad = deshabilitar ? "0.5" : "1";
    if (btnCorrecta) btnCorrecta.style.opacity = opacidad;
    if (btnFalsoSeguro) btnFalsoSeguro.style.opacity = opacidad;
    if (btnFalsoAlarma) btnFalsoAlarma.style.opacity = opacidad;
}

// 5. DISPARAR RE-ENTRENAMIENTO INCREMENTAL
if (btnRetrain) {
    btnRetrain.addEventListener('click', async () => {
        btnRetrain.disabled = true;
        btnRetrain.textContent = "Re-entrenando Modelo...";

        try {
            const respuesta = await fetch('http://127.0.0.1:8000/reentrenar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const datos = await respuesta.json();

            if (datos.status === "success") {
                alert(`✨ ${datos.message}`);
                
                // Reiniciamos el contador de la interfaz
                feedbackCount.textContent = "0";
                
                // Volvemos a deshabilitar el botón hasta juntar otras 5 muestras
                btnRetrain.style.opacity = "0.5";
                btnRetrain.style.cursor = "not-allowed";
                btnRetrain.textContent = "🔄 Disparar Re-entrenamiento";
            } else {
                alert(`⚠️ ${datos.message}`);
                btnRetrain.disabled = false;
                btnRetrain.textContent = "🔄 Disparar Re-entrenamiento";
            }
        } catch (error) {
            console.error("Error al re-entrenar:", error);
            alert("❌ Ocurrió un error de red al intentar re-entrenar.");
            btnRetrain.disabled = false;
            btnRetrain.textContent = "🔄 Disparar Re-entrenamiento";
        }
    });
}

// 6. BOTÓN OPCIONAL DE LIMPIAR
if (botonLimpiar) {
    botonLimpiar.addEventListener('click', () => {
        emailInput.value = "";
        lineaMedicion.style.width = "0%";
        resultadoTexto.textContent = "Esperando correo para analizar...";
        if (contenedorResultados) contenedorResultados.style.display = "none";
    });
}