// Adquirir la API de VS Code
let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (e) {
    console.log("VS Code API ya estaba adquirida.");
}

document.addEventListener('DOMContentLoaded', () => {

    // --- CAPTURA DE ELEMENTOS ---
    const emailInput = document.getElementById('email-input');
    const botonAnalizar = document.getElementById('boton-analizar');
    const botonLimpiar = document.getElementById('boton-limpiar');
    const contenedorResultados = document.getElementById('contenedor-resultados');
    const lineaMedicion = document.getElementById('linea-medicion');
    const resultadoTexto = document.getElementById('resultado-texto');
    const badgeEstado = document.getElementById('badge-estado');
    const porcentajeTextoSuperior = document.getElementById('porcentaje-texto');

    // Botones de Feedback y Re-entrenamiento
    const btnCorrecta = document.getElementById('btn-correcta');
    const btnFalsoSeguro = document.getElementById('btn-falso-seguro');
    const btnFalsoAlarma = document.getElementById('btn-falso-alarma');
    const feedbackCount = document.getElementById('feedback-count');
    const btnRetrain = document.getElementById('btn-retrain');

    // Al arrancar en navegador, consultar si hay feedback previo registrado en el backend
    consultarFeedbackInicial();

    // --- 1. EVENTO BOTÓN ANALIZAR ---
    if (botonAnalizar) {
        botonAnalizar.addEventListener('click', () => {
            const textoCorreo = emailInput ? emailInput.value.trim() : "";

            if (!textoCorreo) {
                if (resultadoTexto) {
                    resultadoTexto.innerHTML = `<span style="color:#f39c12;">⚠️ Por favor, ingresa un correo para analizar.</span>`;
                }
                if (contenedorResultados) contenedorResultados.style.display = "block";
                return;
            }

            botonAnalizar.disabled = true;
            botonAnalizar.textContent = "Analizando...";

            // CAMBIO: Si estamos en VS Code enviamos mensaje a la extensión, si no, hacemos fetch directo a la API
            if (vscode) {
                vscode.postMessage({
                    command: 'analizarCorreo',
                    texto: textoCorreo
                });
            } else {
                /* CAMBIO MODO PÁGINA WEB: Inferencia directa vía API HTTP */
                analizarCorreoDirecto(textoCorreo);
            }
        });
    }

    if (botonLimpiar) {
        botonLimpiar.addEventListener('click', () => {
            // Limpiar caja de texto
            if (emailInput) emailInput.value = "";

            // Reiniciar barra y colores
            if (lineaMedicion) {
                lineaMedicion.style.width = "0%";
                lineaMedicion.style.backgroundColor = "#10b981"; // Verde por defecto
            }

            // Reiniciar textos
            if (porcentajeTextoSuperior) porcentajeTextoSuperior.textContent = "0%";
            if (resultadoTexto) resultadoTexto.innerHTML = "Riesgo Calculado: 0%";
            if (badgeEstado) {
                badgeEstado.textContent = "SEGURO";
                badgeEstado.style.backgroundColor = "#10b981";
            }

            // Ocultar contenedor de resultados
            if (contenedorResultados) contenedorResultados.style.display = "none";
        });
    }

    // --- 3. EVENTOS FEEDBACK ---
    if (btnCorrecta) btnCorrecta.addEventListener('click', () => enviarFeedback('correcta'));
    if (btnFalsoSeguro) btnFalsoSeguro.addEventListener('click', () => enviarFeedback('falso_seguro'));
    if (btnFalsoAlarma) btnFalsoAlarma.addEventListener('click', () => enviarFeedback('falso_alarma'));

    function enviarFeedback(tipo) {
        // CAMBIO: Si estamos en VS Code enviamos por mensaje, si no, directo a la API
        if (vscode) {
            vscode.postMessage({
                command: 'enviarFeedback',
                tipo_feedback: tipo
            });
        } else {
            /* CAMBIO MODO PÁGINA WEB: Envío de feedback directo vía API HTTP */
            enviarFeedbackDirecto(tipo);
        }
    }

    // --- 4. EVENTO RE-ENTRENAR ---
    if (btnRetrain) {
        btnRetrain.addEventListener('click', () => {
            btnRetrain.disabled = true;
            btnRetrain.textContent = "Re-entrenando...";
            if (vscode) {
                vscode.postMessage({ command: 'reentrenar' });
            } else {
                /* CAMBIO MODO PÁGINA WEB: Disparar re-entrenamiento directo vía API HTTP */
                reentrenarDirecto();
            }
        });
    }

    // --- 5. RESPUESTAS DESDE EXTENSION.JS ---
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.command) {
            case 'resultadoAnalisis':
                actualizarUIAnalisis(message.data);
                break;

            case 'resultadoFeedback':
                actualizarUIFeedback(message.data);
                break;

            case 'resultadoReentrenamiento':
                actualizarUIReentrenamiento(message.data);
                break;

            case 'error':
                mostrarErrorAnalisis(message.message);
                break;
        }
    });

    // --- FUNCIONES DE FALLBACK PARA COMUNICACIÓN DIRECTA CON LA API (MODO WEB) ---
    
    async function analizarCorreoDirecto(texto) {
        try {
            const response = await fetch('http://127.0.0.1:8000/prediccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: texto })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Error en el servidor.");
            }

            const data = await response.json();
            actualizarUIAnalisis(data);
        } catch (error) {
            mostrarErrorAnalisis(error.message || "Error de red con FastAPI.");
        }
    }

    async function enviarFeedbackDirecto(tipo) {
        try {
            const response = await fetch('http://127.0.0.1:8000/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo_feedback: tipo })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Error al registrar feedback.");
            }

            const data = await response.json();
            actualizarUIFeedback(data);
        } catch (error) {
            alert(`❌ ${error.message}`);
        }
    }

    async function reentrenarDirecto() {
        try {
            const response = await fetch('http://127.0.0.1:8000/reentrenar', {
                method: 'POST'
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Error en el re-entrenamiento.");
            }

            const data = await response.json();
            actualizarUIReentrenamiento(data);
        } catch (error) {
            alert(`❌ ${error.message}`);
            if (btnRetrain) {
                btnRetrain.disabled = false;
                btnRetrain.textContent = "🔄 Disparar Re-entrenamiento";
            }
        }
    }

    // --- FUNCIONES COMUNES PARA ACTUALIZAR ELEMENTOS DE LA INTERFAZ (DRY) ---

    function actualizarUIAnalisis(data) {
        if (botonAnalizar) {
            botonAnalizar.disabled = false;
            botonAnalizar.textContent = "Analizar Correo";
        }
        if (contenedorResultados) contenedorResultados.style.display = "block";

        if (data && data.probabilidad_phishing !== undefined) {
            const prob = data.probabilidad_phishing;
            const porcentaje = Math.round(prob * 100);

            // Ancho de la barra de medición
            if (lineaMedicion) lineaMedicion.style.width = `${porcentaje}%`;

            // Porcentaje del indicador superior
            if (porcentajeTextoSuperior) {
                porcentajeTextoSuperior.textContent = `${porcentaje}%`;
            }

            // Reporte detallado de probabilidad
            if (resultadoTexto) {
                resultadoTexto.innerHTML = `<strong>Probabilidad de Phishing:</strong> ${porcentaje}%`;
            }

            // Cambios de color según el umbral de riesgo
            if (porcentaje < 30) {
                if (lineaMedicion) lineaMedicion.style.backgroundColor = "#10b981"; // Verde
                if (badgeEstado) {
                    badgeEstado.textContent = "SEGURO";
                    badgeEstado.style.backgroundColor = "#10b981";
                }
            } else if (porcentaje >= 30 && porcentaje < 70) {
                if (lineaMedicion) lineaMedicion.style.backgroundColor = "#f59e0b"; // Amarillo
                if (badgeEstado) {
                    badgeEstado.textContent = "SOSPECHOSO";
                    badgeEstado.style.backgroundColor = "#f59e0b";
                }
            } else {
                if (lineaMedicion) lineaMedicion.style.backgroundColor = "#ef4444"; // Rojo
                if (badgeEstado) {
                    badgeEstado.textContent = "ALERTA DE PHISHING";
                    badgeEstado.style.backgroundColor = "#ef4444";
                }
            }
        }
    }

    function mostrarErrorAnalisis(message) {
        if (botonAnalizar) {
            botonAnalizar.disabled = false;
            botonAnalizar.textContent = "Analizar Correo";
        }
        if (resultadoTexto) {
            resultadoTexto.innerHTML = `<span style="color:#e74c3c;">❌ ${message}</span>`;
        }
        if (contenedorResultados) contenedorResultados.style.display = "block";
    }

    function actualizarUIFeedback(data) {
        // Soporta tanto 'total_feedback' como 'total_feedback_acumulado' para evitar fallos de compatibilidad
        const total = data.total_feedback_acumulado !== undefined ? data.total_feedback_acumulado : data.total_feedback;
        if (total !== undefined) {
            if (feedbackCount) feedbackCount.textContent = total;

            // Habilita el re-entrenamiento solo si alcanzamos el mínimo de 5 muestras
            if (btnRetrain) {
                btnRetrain.disabled = total < 5;
                btnRetrain.style.opacity = total >= 5 ? "1" : "0.5";
                btnRetrain.style.cursor = total >= 5 ? "pointer" : "not-allowed";
            }
        }
    }

    function actualizarUIReentrenamiento(data) {
        if (btnRetrain) {
            btnRetrain.disabled = true;
            btnRetrain.style.opacity = "0.5";
            btnRetrain.style.cursor = "not-allowed";
            btnRetrain.textContent = "🔄 Disparar Re-entrenamiento";
        }
        if (feedbackCount) feedbackCount.textContent = "0";

        if (data && data.mensaje) {
            alert(`✅ ${data.mensaje}`);
        }
    }

    // Consulta el contador actual de registros al cargar (Modo Web)
    async function consultarFeedbackInicial() {
        if (vscode) return; // Si estamos en VS Code, no hace falta
        try {
            // Obtenemos estadísticas iniciales de registros en la DB
            const response = await fetch('http://127.0.0.1:8000/');
            if (response.ok) {
                const data = await response.json();
                // Si la API retorna estadísticas en el root, inicializamos
                // (main.py retorna collected_feedback_samples en su diagnóstico, o podemos consultar stats)
                const statsResponse = await fetch('http://127.0.0.1:8000/stats');
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    if (stats.total_samples !== undefined) {
                        actualizarUIFeedback({ total_feedback_acumulado: stats.total_samples });
                    }
                }
            }
        } catch (e) {
            console.log("Servidor FastAPI local offline o inalcanzable.");
        }
    }

});