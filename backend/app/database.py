import sqlite3
from pathlib import Path

# Determinamos la ruta de la base de datos (backend/data/feedback.db)
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "feedback.db"

def init_db():
    """Crea la carpeta data y la tabla feedback si no existen."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
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