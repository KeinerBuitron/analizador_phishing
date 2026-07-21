import sqlite3
import os

# Determinamos la ruta de la base de datos (backend/data/feedback.db)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "feedback.db")

def init_db():
    """Crea la carpeta data y la tabla feedback si no existen."""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            palabras_sospechosas REAL,
            signos REAL,
            enlaces REAL,
            ips REAL,
            porcentaje_alarmista REAL,
            etiqueta INTEGER
        )
    ''')
    conn.commit()
    conn.close()

def guardar_feedback_db(fila_numerica, etiqueta):
    """Guarda un registro de feedback y devuelve el total acumulado."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO feedback (palabras_sospechosas, signos, enlaces, ips, porcentaje_alarmista, etiqueta)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (*fila_numerica, etiqueta))
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM feedback")
    total = cursor.fetchone()[0]
    conn.close()
    return total

def obtener_todo_el_feedback():
    """Recupera todos los registros guardados en la BD."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT palabras_sospechosas, signos, enlaces, ips, porcentaje_alarmista, etiqueta FROM feedback")
    filas = cursor.fetchall()
    conn.close()
    return filas