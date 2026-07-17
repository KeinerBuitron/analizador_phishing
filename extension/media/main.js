// 1. Capturamos los elementos de la interfaz usando sus IDs de HTML
const emailInput = document.getElementById('email-input');
const botonAnalizar = document.getElementById('boton-analizar');
const lineaMedicion = document.getElementById('linea-medicion');
const resultadoTexto = document.getElementById('resultado-texto');

// 2. Escuchamos activamente cuando el usuario haga clic en el botón
// NOTA: Agregamos "async" antes de la función para poder usar "await" dentro
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
        // Enviamos una petición POST al endpoint '/prediccion'
        const respuesta = await fetch('http://127.0.0.1:8000/prediccion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texto: textoCorreo // Enviamos el JSON que tu modelo "Carga_correo" espera
            })
        });

        // Verificamos si la respuesta de la red fue exitosa (código 200)
        if (!respuesta.ok) {
            throw new Error('Error en la respuesta del servidor de FastAPI');
        }

        // Convertimos la respuesta cruda en un objeto JSON de JavaScript
        const datos = await respuesta.json();

        // 4. PROCESAR LOS DATOS DE MACHINE LEARNING
        // Tu backend devuelve "probabilidad_phishing" (un decimal entre 0.0 y 1.0)
        // Multiplicamos por 100 para convertirlo en un porcentaje entero (0 - 100)
        const porcentajeReal = Math.round(datos.probabilidad_phishing * 100);

        // Actualizamos la interfaz con la predicción del modelo
        actualizarInterfaz(porcentajeReal);

    } catch (error) {
        // En caso de que FastAPI esté apagado o haya un error de red
        console.error("Error al conectar con la API:", error);
        resultadoTexto.innerHTML = `<strong>⚠️ Error de conexión:</strong> No se pudo conectar con el servidor de análisis. Asegúrate de que Python esté corriendo.`;
        lineaMedicion.style.width = "0%";
    } finally {
        // Reactivamos el botón al terminar (ya sea con éxito o error)
        botonAnalizar.disabled = false;
        botonAnalizar.textContent = "Analizar Correo";
    }
});

// 4. Función para actualizar la barra y los colores dinámicamente (Se mantiene igual)
function actualizarInterfaz(porcentaje) {
    lineaMedicion.style.width = `${porcentaje}%`;

    if (porcentaje < 30) {
        lineaMedicion.style.backgroundColor = "var(--verde)"; 
        resultadoTexto.innerHTML = `<strong>Seguro (${porcentaje}%)</strong>: No se detectaron anomalías severas.`;
    } else if (porcentaje >= 30 && porcentaje < 70) {
        lineaMedicion.style.backgroundColor = "var(--amarillo)"; 
        resultadoTexto.innerHTML = `<strong>Sospechoso (${porcentaje}%)</strong>: Revisa con atención los remitentes.`;
    } else {
        lineaMedicion.style.backgroundColor = "var(--rojo)"; 
        resultadoTexto.innerHTML = `<strong>⚠️ ALERTA DE PHISHING (${porcentaje}%)</strong>: Patrones de fraude detectados.`;
    }
}