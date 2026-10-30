# Autoevaluación · Informática Básica y Tecnología de la Información

Aplicación web **instalable (PWA)** para celular y computadora, sin dependencias (HTML + CSS + JavaScript).
Banco de **150 preguntas** (semanas 1–15) tomado del archivo `Banco_150_Preguntas_Informatica_Basica.docx`:
75 fáciles (50 %), 45 intermedias (30 %) y 30 difíciles (20 %), con 4 alternativas (a–d).

## Secciones (barra inferior)
- **Inicio**: arma un test de **10, 20, 40 o TODO (150)** preguntas. Se elige el orden:
  - **Aleatorio**: mezcla al azar (sin filtros mantiene 50 % fáciles, 30 % intermedias, 20 % difíciles).
  - **Secuencial**: sigue el orden del balotario (N.º 1–150) y **continúa donde el estudiante se quedó** (con opción de volver al principio).
  - Filtros opcionales por **nivel** y **semana**.
  - Tras cada respuesta indica si es **correcta o incorrecta** y, si falló, la **alternativa correcta**. Al final: aciertos, errores, desglose por nivel y, bajo cada pregunta mala, la alternativa correcta.
- **Estudiar**: tarjetas sin puntaje (también secuencial o aleatorio, con filtros). Se muestra la respuesta correcta al tocar una alternativa o
  «Mostrar respuesta»; se puede marcar «Ya la domino».
- **Progreso**: tests realizados, promedio y mejor resultado, **dominio del banco**, aciertos por nivel y por semana (toca una semana para estudiarla),
  últimos tests y **repaso de errores**. Todo se guarda solo en el dispositivo.
- Funciona **sin conexión** y se puede **instalar** como app (Android/Chrome: botón «Instalar app»; iPhone/Safari: Compartir → «Añadir a pantalla de inicio»).
- Modo claro/oscuro automático, atajos de teclado y diseño accesible.

## Publicar en GitHub Pages
1. Crea un repositorio público y sube el contenido de esta carpeta a la rama `main`.
2. En **Settings → Pages**: *Deploy from a branch* → `main` → `/ (root)`.
3. La app quedará en `https://<usuario>.github.io/<repositorio>/` (usa HTTPS, necesario para instalarla como app).

## Editar preguntas
Están en `questions.js` (`answer` = índice 0–3 de la alternativa correcta). Si cambias preguntas, sube el número de versión
`CACHE` en `sw.js` (p. ej. `autoeval-v5`) para que los celulares descarguen la actualización.

## Probar en local
```
python3 -m http.server 8000   # abrir http://localhost:8000
```
