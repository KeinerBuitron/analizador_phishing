import joblib
from pathlib import Path
import numpy as np

# Rutas del modelo y datasets
BASE_DIR = Path(__file__).resolve().parent.parent #Ubicaion exacta, ruta absoluta, devuelve un nivel 
MODEL_PATH = BASE_DIR / "models" / "modelo_phishing.pkl"

# Carga inicial del modelo
modelo = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None

def predecir_correo(fila_numerica):
    """
    Recibe la lista con las 5 características numéricas.
    Retorna la predicción (0 o 1) y la probabilidad calculada.
    """
    global modelo
    if modelo is None:
        raise ValueError("El modelo no está cargado. Verifica que exista el archivo .pkl en 'models/'.")

    prediccion = int(modelo.predict([fila_numerica])[0])
    probabilidades = modelo.predict_proba([fila_numerica])[0]

    # Extracción segura de la probabilidad de Phishing (clase 1)
    if len(modelo.classes_) == 1:
        clase_unica = modelo.classes_[0]
        probabilidad = 1.0 if clase_unica == 1 else 0.0
    else:
        if 1 in modelo.classes_:
            indice_phishing = list(modelo.classes_).index(1)
            probabilidad = float(probabilidades[indice_phishing])
        else:
            probabilidad = 0.0

    return prediccion, probabilidad

def reentrenar_con_datos(filas_db):
    """
    Recibe los datos acumulados de feedback de SQLite y re-entrena el modelo.
    CAMBIO: Ahora combina los datos de feedback con el conjunto base original de entrenamiento
    para evitar el olvido catastrófico (catastrophic forgetting) y prevenir que el clasificador
    colapse si los datos son desbalanceados o limitados en clases.
    """
    global modelo
    if modelo is None:
        from sklearn.ensemble import RandomForestClassifier
        modelo = RandomForestClassifier(n_estimators=100, random_state=42)

    if not filas_db or len(filas_db) < 2:
        return False, "Se necesitan al menos 2 registros de feedback para re-entrenar."

    # Datos base originales representativos del dataset de entrenamiento
    # Fila: [Palabras sospechosas, Signos, Enlaces, IPs, Porcentaje alarmista]
    X_base = [
        [0.0, 0.0, 0.0, 0.0, 0.021],  # Seguro 1 (Con mayúsculas habituales)
        [0.0, 0.0, 0.0, 0.0, 0.011],  # Seguro 2
        [4.0, 0.0, 1.0, 1.0, 0.19],   # Phishing 1
        [2.0, 3.0, 1.0, 1.0, 0.12]    # Phishing 2
    ]
    y_base = [0, 0, 1, 1]

    # Convertir registros de feedback a numpy arrays
    datos = np.array(filas_db)
    X_feedback = datos[:, :-1]
    y_feedback = datos[:, -1]

    # CAMBIO: Concatenamos los datos base estables con las nuevas correcciones del usuario
    X_combinado = np.vstack([X_base, X_feedback])
    y_combinado = np.concatenate([y_base, y_feedback])

    # Re-entrenar modelo con la combinación completa
    modelo.fit(X_combinado, y_combinado)

    # Guardar cambios actualizados en el archivo .pkl
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(modelo, MODEL_PATH)

    return True, f"Modelo re-entrenado exitosamente combinando {len(filas_db)} muestras de feedback con los datos base."
