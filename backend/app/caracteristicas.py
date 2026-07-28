import re
def extraccion_caracteristicas(email):
    patron_palabras = r'\b(urgente|banco|cuenta|bloqueada|inmediatamente|suspensión|cancelación|expirará|ganador|reembolso|premio|herencia|factura|verificar|actualizar|seguridad|inusual|acceso)\b'
    patron_signos = r'[!?$]'
    patron_enlaces = r'(https?://\S+)|(www\.\S+)'
    direccion_ip = r'\b(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b'

    lista_enlaces = re.findall(patron_enlaces, email)
    conteo_enlaces = len(lista_enlaces)
    conteo_direccion_ip = re.findall(direccion_ip, email)
    texto_limpio = re.sub(patron_enlaces, '', email) #Reemplaza enlace por espacio en blanco

    lista_palabras = re.findall(patron_palabras, texto_limpio, re.IGNORECASE)
    lista_signos = re.findall(patron_signos, texto_limpio)
    
    conteo_direcciones_ip = len(conteo_direccion_ip)
    conteo_palabras = len(lista_palabras)
    conteo_signos = len(lista_signos)   

    # radio de tono alarmista
    contador_mayusculas = 0
    for caracter in email:
        if caracter.isupper():
            contador_mayusculas += 1
    largo_total = len(email)

    if largo_total > 0:
        radio_mayusculas = contador_mayusculas / largo_total
    else:
        radio_mayusculas = 0.0

    resultados = {
        "Palabras sospechosas": conteo_palabras,
        "Signos de exclamación o interrogación": conteo_signos,
        "Enlaces": conteo_enlaces,
        "Direcciones IP": conteo_direcciones_ip,
        "Porcentaje alarmista": radio_mayusculas
    }
    return resultados
