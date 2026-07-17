from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib

try:
    from .caracteristicas import extraccion_caracteristicas
except ImportError:
    from app.caracteristicas import extraccion_caracteristicas

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "modelos" / "modelo_phishing.pkl"

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

class Carga_correo(BaseModel):
    texto: str

@app.get("/", tags=['Home'])
def home():
    return "Bienvenido a mi API de analizador de phishing"

@app.post("/prediccion", tags=['Prediccion'])
def predecir(correo: Carga_correo):
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

    return {
        "es_phishing": int(predicion),
        "probabilidad_phishing": float(probabilidad_phishing),
        "caracteristicas_extraidas": caracteristicas
    }