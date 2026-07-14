from fastapi import FastAPI
from pydantic import BaseModel
import joblib
from app.caracteristicas import extraccion_caracteristicas

modelo = joblib.load("modelos/modelo_phishing.pkl") # Cargar el modelo pkl
app = FastAPI()

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

    predicion =modelo.predict([fila_numerica])[0]
    probabilidades = modelo.predict_proba([fila_numerica])[0]
    probabilidad_phishing = probabilidades[1]  # Probabilidad de que sea phishing

    return {
        "es_phishing": int(predicion),
        "probabilidad_phishing": float(probabilidad_phishing),
        "caracteristicas_extraidas": caracteristicas
    }