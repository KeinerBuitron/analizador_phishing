from pathlib import Path #Rutas
import joblib
from sklearn.ensemble import RandomForestClassifier
from app.caracteristicas import extraccion_caracteristicas

BASE_DIR = Path(__file__).resolve().parent #Ubicaion exacta, ruta absoluta, devuelve un nivel 
MODEL_PATH = BASE_DIR / "models" / "modelo_phishing.pkl"

# PASO 1: Correos de ejemplo con respuestas conocidas ---
correos_entrenamiento = [
    # Correos seguros (Etiqueta: 0)
    "Hola, ¿cómo estás? Te confirmo la reunión para revisar el avance del semillero mañana a las 3.",
    "Estimado estudiante, le recordamos que las matrículas académicas cierran el próximo viernes.",
    
    # Correos de phishing (Etiqueta: 1)
    "ALERTA BANCO: Su cuenta ha sido bloqueada. Ingrese URGENTE aquí http://192.168.1.1/login a verificar.",
    "¡GANADOR! Has ganado un premio de $50000 USD de inmediato. Registra tu contraseña en http://89.2.1.2/sorteo"
]
# Respuestas correctas correspondientes (0 = Seguro, 1 = Phishing)
Y = [0, 0, 1, 1]

# PASO 2: convertir los correos a numeros (Matriz X)
X = []
for correo in correos_entrenamiento:
    caracteristicas = extraccion_caracteristicas(correo)
    fila_numerica = [
        caracteristicas["Palabras sospechosas"],
        caracteristicas["Signos de exclamación o interrogación"],
        caracteristicas["Enlaces"],
        caracteristicas["Direcciones IP"],
        caracteristicas["Porcentaje alarmista"]
    ]
    X.append(fila_numerica)

# PASO 3: crear el clasificador Random Forest vacio
modelo = RandomForestClassifier(n_estimators=100, random_state=42) # Semilla, precision
# Entrenamos el modelo 
modelo.fit(X, Y)
print("El modelo ha sido entrenado con exito")

# PASO 4: guardar el modelo en un archivo fisico 
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(modelo, MODEL_PATH)
print(f"Modelo guardado como '{MODEL_PATH}'")
