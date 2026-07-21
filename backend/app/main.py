from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Importaciones de los módulos internos
from app.database import init_db, guardar_feedback_db, obtener_todo_el_feedback
from app.caracteristicas import extraccion_caracteristicas
from app.modelo import predecir_correo, reentrenar_con_datos

app = FastAPI(title="API Analizador de Phishing", version="1.0")

# Permitir peticiones desde la extensión / frontend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar la tabla de la base de datos SQLite al arrancar
init_db()

# Variables en memoria para asociar el último análisis con el feedback recibido
ultima_fila_analizada = None
ultima_predicion_modelo = None


# Modelos Pydantic para validar entradas JSON
class CargaCorreo(BaseModel):
    texto: str

class CargaFeedback(BaseModel):
    tipo_feedback: str  # "correcta", "falso_seguro", "falso_alarma"


@app.get("/")
def inicio():
    return {"status": "ok", "mensaje": "API de Detección de Phishing activa"}


@app.post("/prediccion", tags=['Predicción'])
def predecir(correo: CargaCorreo):
    global ultima_fila_analizada, ultima_predicion_modelo

    if not correo.texto.strip():
        raise HTTPException(status_code=400, detail="El texto del correo no puede estar vacío.")

    # 1. Extraer características
    caracteristicas = extraccion_caracteristicas(correo.texto)
    fila_numerica = list(caracteristicas.values())

    # 2. Obtener predicción del modelo
    try:
        prediccion, probabilidad = predecir_correo(fila_numerica)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el modelo: {str(e)}")

    # 3. Guardar en memoria para el endpoint de feedback
    ultima_fila_analizada = fila_numerica
    ultima_predicion_modelo = prediccion

    return {
        "es_phishing": prediccion,
        "probabilidad_phishing": probabilidad,
        "caracteristicas_extraidas": caracteristicas
    }


@app.post("/feedback", tags=['Feedback'])
def registrar_feedback(payload: CargaFeedback):
    global ultima_fila_analizada, ultima_predicion_modelo

    if ultima_fila_analizada is None:
        raise HTTPException(
            status_code=400, 
            detail="No hay ningún correo analizado recientemente para asociar el feedback."
        )

    # Determinar la etiqueta real corregida por el usuario
    # 1 = Phishing, 0 = Seguro
    tipo = payload.tipo_feedback
    if tipo == "correcta":
        etiqueta_real = ultima_predicion_modelo
    elif tipo == "falso_seguro":
        etiqueta_real = 1  # Realmente era Phishing
    elif tipo == "falso_alarma":
        etiqueta_real = 0  # Realmente era Seguro
    else:
        raise HTTPException(status_code=400, detail="Tipo de feedback no válido.")

    # Guardar en SQLite
    total_registros = guardar_feedback_db(ultima_fila_analizada, etiqueta_real)

    return {
        "status": "success",
        "mensaje": "Feedback guardado exitosamente en la base de datos.",
        "total_feedback_acumulado": total_registros
    }


@app.post("/reentrenar", tags=['Re-entrenamiento'])
def reentrenar():
    # 1. Consultar todos los registros guardados en SQLite
    filas_db = obtener_todo_el_feedback()

    # 2. Ejecutar re-entrenamiento y validación de clases
    exito, mensaje = reentrenar_con_datos(filas_db)

    if not exito:
        raise HTTPException(status_code=400, detail=mensaje)

    return {
        "status": "success",
        "mensaje": mensaje,
        "muestras_usadas": len(filas_db)
    }