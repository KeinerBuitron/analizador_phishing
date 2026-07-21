from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib

try:
    from .caracteristicas import extraccion_caracteristicas
except ImportError:
    from app.caracteristicas import extraccion_caracteristicas

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "modelo_phishing.pkl"

modelo = joblib.load(MODEL_PATH)  # Cargar el modelo pkl
app = FastAPI()

# CONFIGURACIÓN DE CORS:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite peticiones desde cualquier origen
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST)
    allow_headers=["*"],  
)

# --- 1. VARIABLES GLOBALES DE CONTROL (AÑADE ESTAS LÍNEAS ARRIBA) ---
nuevas_muestras = []  # Aquí se acumularán los vectores para el re-entrenamiento
ultima_fila_analizada = None  # Almacena temporalmente la última fila_numerica
ultima_predicion_modelo = None  # Almacena temporalmente el resultado (0 o 1)

class Carga_correo(BaseModel):
    texto: str

class CargaFeedback(BaseModel):
    tipo_feedback: str

@app.get("/", tags=['Home'])
def home():
    return "Bienvenido a mi API de analizador de phishing"

@app.post("/prediccion", tags=['Prediccion'])
def predecir(correo: Carga_correo):
    # <-- 2. INDISPENSABLE: Declarar global para guardar en la caché real
    global ultima_fila_analizada, ultima_predicion_modelo
    caracteristicas = extraccion_caracteristicas(correo.texto)

    fila_numerica = [
        caracteristicas["Palabras sospechosas"],
        caracteristicas["Signos de exclamación o interrogación"],
        caracteristicas["Enlaces"],
        caracteristicas["Direcciones IP"],
        caracteristicas["Porcentaje alarmista"]
    ]

    predicion = modelo.predict([fila_numerica])[0]
    probabilidades = modelo.predict_proba([fila_numerica])[0]
    probabilidad_phishing = probabilidades[1]  

    # --- AQUÍ GUARDAMOS EN LA CACHÉ ANTES DE RETORNAR ---
    ultima_fila_analizada = fila_numerica
    ultima_predicion_modelo = int(predicion)
    
    return {
        "es_phishing": int(predicion),
        "probabilidad_phishing": float(probabilidad_phishing),
        "caracteristicas_extraidas": caracteristicas
    }

# --- 3. ENDPOINT PARA RECIBIR LA CALIFICACIÓN DEL USUARIO ---
@app.post("/feedback", tags=['Prediccion'])
def recibir_feedback(feedback: CargaFeedback):
    global ultima_fila_analizada, ultima_predicion_modelo, nuevas_muestras
    
    # Si el usuario presiona un botón sin haber analizado un correo antes, da error
    if ultima_fila_analizada is None:
        raise HTTPException(status_code=400, detail="No hay análisis activo para calificar.")
        
    # Por defecto, asumimos que el modelo acertó (0 o 1)
    etiqueta_real = ultima_predicion_modelo
    
    # Si el usuario corrige al modelo, cambiamos la etiqueta de forma manual:
    if feedback.tipo_feedback == "falso_seguro":
        etiqueta_real = 1  # El modelo dijo Seguro (0), pero el humano dice que ES Phishing (1)
    elif feedback.tipo_feedback == "falso_alarma":
        etiqueta_real = 0  # El modelo dijo Phishing (1), pero el humano dice que ES Seguro (0)
        
    # Guardamos el vector numérico estructurado junto a su etiqueta real corregida
    nuevas_muestras.append({
        "x": ultima_fila_analizada,
        "y": etiqueta_real
    })
    
    # Limpiamos la caché para quedar listos para el siguiente correo
    ultima_fila_analizada = None
    ultima_predicion_modelo = None
    
    return {
        "status": "success",
        "total_feedback": len(nuevas_muestras) # Le avisa al frontend cuántas van (1, 2, 3...)
    }


# --- 4. ENDPOINT PARA RE-ENTRENAR EL MODELO ---
@app.post("/reentrenar", tags=['Prediccion'])
def reentrenar_modelo():
    global modelo, nuevas_muestras
    
    if len(nuevas_muestras) < 5:
        return {"status": "error", "message": "Faltan muestras para iniciar el re-entrenamiento."}
        
    try:
        # Separamos los datos acumulados en vectores X (características) e y (etiquetas)
        X_nuevas = [muestra["x"] for muestra in nuevas_muestras]
        y_nuevas = [muestra["y"] for muestra in nuevas_muestras]
        
        # Ajustamos el Random Forest con los nuevos patrones analizados
        modelo.fit(X_nuevas, y_nuevas)
        
        # Sobreescribimos el archivo binario para guardar el conocimiento permanentemente
        joblib.dump(modelo, MODEL_PATH)
        
        cantidad_procesada = len(nuevas_muestras)
        nuevas_muestras = [] # Reseteamos la lista global a cero
        
        return {
            "status": "success",
            "message": f"Modelo re-entrenado con éxito utilizando {cantidad_procesada} muestras calificadas."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}