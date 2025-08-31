# app.py

import os
from flask import (Flask, Response, jsonify, request, render_template, redirect, url_for, flash, send_from_directory)
from flask_cors import CORS
from flask_login import (LoginManager, UserMixin, login_user, logout_user, login_required, current_user)
from werkzeug.security import check_password_hash
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
import time
import random
import json
import csv
from datetime import datetime
import pandas as pd
import numpy as np
import math
from functools import wraps
from flask import abort

# =======================================================
# 1. CONFIGURACIÓN DE LA APLICACIÓN
# =======================================================
app = Flask(__name__, template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', ':j$n&8WWw\:!N--3A*d5jgQM|nr6aU') # ¡Esto debería ser más aleatorio en producción!
app.config['UPLOAD_FOLDER'] = 'static/uploads'
CORS(app)

SECRET_API_KEY = "xoxo-data"
LOG_DIRECTORY = "flight_logs"

# --- Crear directorios necesarios al iniciar ---
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('database', exist_ok=True)
os.makedirs(LOG_DIRECTORY, exist_ok=True)

# --- Configuración de Flask-Login ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login' # Redirige a esta ruta si se intenta acceder a una página protegida sin login

# =======================================================
# 2. MODELO DE USUARIO Y FUNCIONES DE AYUDA
# =======================================================
class User(UserMixin):
    """Clase de usuaruo de flask"""
    def __init__(self, id, username, password_hash, name, role): # <-- Añadir role
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.name = name
        self.role = role # <-- Añadir role

@login_manager.user_loader
def load_user(user_id):
    try:
        users_df = pd.read_csv('database/users.csv')
        user_data = users_df[users_df['id'] == int(user_id)].iloc[0]
        # ASEGÚRATE DE QUE ESTA LÍNEA INCLUYA EL ROL
        return User(id=user_data['id'], username=user_data['username'], 
                    password_hash=user_data['password_hash'], name=user_data['name'],
                    role=user_data.get('role', 'member'))
    except (FileNotFoundError, IndexError):
        return None

# --- DECORADOR DE PERMISOS ---
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            abort(403) # Error Forbidden si no es admin
        return f(*args, **kwargs)
    return decorated_function

def log_change(user_name, action):
    """Registra una acción administrativa en un archivo CSV."""
    log_path = 'database/changelog.csv'
    fieldnames = ['timestamp', 'user', 'action']
    log_entry = {'timestamp': datetime.now().isoformat(), 'user': user_name, 'action': action}
    
    file_exists = os.path.isfile(log_path)
    with open(log_path, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(log_entry)

# =======================================================
# 3. RUTAS PARA SERVIR PÁGINAS Y ARCHIVOS ESTÁTICOS
# =======================================================

# --- Ruta para servir TODOS los archivos de la carpeta 'static' ---
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# --- Rutas para CADA página HTML, ahora servidas como plantillas ---
@app.route('/')
def index_page():
    """Sirve la página principal, inyectando los datos de la noticia."""
    try:
        with open('database/news.json', 'r', encoding='utf-8') as f:
            news_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Datos por defecto si el archivo no existe
        news_data = {
            "title": "Estado Actual", "date": "Fecha no disponible", 
            "content": "Contenido no disponible.", "image": "static/images/pic08.jpg", "link": "#"
        }
    return render_template('index.html', news=news_data)

@app.route('/nosotros')
def nosotros_page():
    return render_template('nosotros.html')

@app.route('/integrantes')
def integrantes_page():
    return render_template('integrantes.html')

@app.route('/bio')
def bio_page():
    return render_template('bio.html')

@app.route('/sponsors')
def sponsors_page():
    return render_template('sponsors.html')

@app.route('/sponsor-detail')
def sponsor_detail_page():
    return render_template('sponsor-detail.html')

@app.route('/concurso-2024')
def concurso_2024_page():
    return render_template('concurso-2024.html')

@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

# =======================================================
# 4. RUTAS DE AUTENTICACIÓN Y PANEL DE ADMIN (Renderizadas)
# =======================================================

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        try:
            users_df = pd.read_csv('database/users.csv')
            user_data = users_df[users_df['username'] == username]
            if not user_data.empty:
                user_row = user_data.iloc[0]
                if check_password_hash(user_row['password_hash'], password):
                    user = User(id=user_row['id'], username=user_row['username'], password_hash=user_row['password_hash'], name=user_row['name'], role=user_row['role'])
                    login_user(user)
                    log_change(user.name, "Inicio de sesión exitoso")
                    return redirect(url_for('admin_panel'))
        except FileNotFoundError:
            flash('Error interno del servidor. No se encontró el archivo de usuarios.', 'danger')
            return redirect(url_for('login'))
        
        flash('Usuario o contraseña incorrectos.', 'danger')
        return redirect(url_for('login'))
        
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    log_change(current_user.name, "Cierre de sesión")
    logout_user()
    return redirect(url_for('login'))

@app.route('/admin')
@login_required
def admin_panel():
    return render_template('admin.html')

@app.route('/admin/profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    # Usamos el ID del usuario, que es único, numérico y fiable.
    user_id = current_user.id
    
    try:
        # Leemos el CSV y nos aseguramos de que la columna user_id sea numérica, manejando errores.
        team_df = pd.read_csv('database/team.csv')
        # Pandas puede leer la columna vacía como float, la convertimos a un entero nullable
        team_df['user_id'] = team_df['user_id'].astype('Int64')
    except FileNotFoundError:
        flash("Error: No se encontró el archivo de datos del equipo.", 'danger')
        return redirect(url_for('admin_panel'))
    
    # Buscamos al miembro del equipo usando el user_id del usuario logueado
    member_data = team_df[team_df['user_id'] == user_id]

    if member_data.empty:
        flash("No hay un perfil de equipo asociado a tu cuenta de administrador. Contacta al administrador principal.", 'danger')
        return redirect(url_for('admin_panel'))

    # Obtenemos el índice de la fila que vamos a modificar
    member_index = member_data.index[0]

    # --- LÓGICA PARA CUANDO SE ENVÍA EL FORMULARIO (POST) ---
    if request.method == 'POST':
        # 1. Obtener datos del formulario
        updated_data = {
            'name': request.form.get('name'),
            'role': request.form.get('role'),
            'bio': request.form.get('bio'),
            'focus_areas': request.form.get('focus_areas'),
            'link_linkedin': request.form.get('link_linkedin'),
            'link_github': request.form.get('link_github'),
            'link_portfolio': request.form.get('link_portfolio')
        }

        # 2. Manejar la subida de la imagen (si existe)
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(save_path)
                # Actualizamos la ruta de la imagen en los datos a guardar
                updated_data['image'] = save_path.replace('\\', '/')

        # 3. Actualizar el DataFrame de Pandas en la fila correcta
        for key, value in updated_data.items():
            if key in team_df.columns:
                team_df.loc[member_index, key] = value
        
        # 4. Guardar el DataFrame actualizado de vuelta al CSV
        team_df.to_csv('database/team.csv', index=False)
        
        # 5. Registrar el cambio y mostrar mensaje de éxito
        log_change(current_user.name, "Actualizó su perfil")
        flash('¡Tu perfil ha sido actualizado exitosamente!', 'success')
        
        # 6. Redirigir de vuelta a la misma página para ver los cambios y el mensaje
        return redirect(url_for('edit_profile'))

    # --- LÓGICA PARA CUANDO SE CARGA LA PÁGINA (GET) ---
    # Convertimos la fila del DataFrame a un diccionario para pasarlo a la plantilla
    member_dict = team_df.loc[member_index].to_dict()
    
    # Limpiamos los posibles NaN que queden antes de enviar a la plantilla
    for key, value in member_dict.items():
        if pd.isna(value):
            member_dict[key] = '' # Convertimos NaN a string vacío

    # Convertimos la cadena de 'focus_areas' en una lista para el join del template
    if isinstance(member_dict.get('focus_areas'), str):
        member_dict['focus_areas'] = member_dict['focus_areas'].split(';')
    else:
        member_dict['focus_areas'] = [] # Aseguramos que sea una lista si está vacío

    return render_template('edit_profile.html', member_data=member_dict)

@app.route('/admin/sponsors')
@login_required
def manage_sponsors():
    """Muestra la lista de todos los sponsors para gestionarlos."""
    try:
        sponsors_df = pd.read_csv('database/sponsors.csv')
        sponsors = sponsors_df.to_dict(orient='records')
    except FileNotFoundError:
        sponsors = []
    return render_template('manage_sponsors.html', sponsors=sponsors)

@app.route('/admin/sponsors/add', methods=['GET', 'POST'])
@login_required
def add_sponsor():
    """Muestra el formulario para añadir un nuevo sponsor y procesa el envío."""
    if request.method == 'POST':
        sponsors_df = pd.read_csv('database/sponsors.csv')
        # Determinar el nuevo ID
        new_id = sponsors_df['id'].max() + 1 if not sponsors_df.empty else 1
        
        new_sponsor_data = {
            'id': new_id,
            'name': request.form.get('name'),
            'bio': request.form.get('bio'),
            'website': request.form.get('website')
        }
        
        # Manejar subida de archivos
        for field in ['logo', 'image']:
            if field in request.files:
                file = request.files[field]
                if file.filename != '':
                    filename = secure_filename(f"sponsor_{new_id}_{field}_{file.filename}")
                    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(save_path)
                    new_sponsor_data[field] = save_path.replace('\\', '/')
        
        new_row = pd.DataFrame([new_sponsor_data])
        sponsors_df = pd.concat([sponsors_df, new_row], ignore_index=True)
        sponsors_df.to_csv('database/sponsors.csv', index=False)
        
        log_change(current_user.name, f"Añadió al sponsor '{new_sponsor_data['name']}'")
        flash('Sponsor añadido exitosamente!', 'success')
        return redirect(url_for('manage_sponsors'))

    # Para la petición GET, mostramos el formulario vacío
    return render_template('edit_sponsor.html', is_new=True, sponsor={})

@app.route('/admin/sponsors/edit/<int:sponsor_id>', methods=['GET', 'POST'])
@login_required
def edit_sponsor(sponsor_id):
    """Muestra el formulario para editar un sponsor existente y procesa el envío."""
    sponsors_df = pd.read_csv('database/sponsors.csv')
    sponsor_data = sponsors_df[sponsors_df['id'] == sponsor_id]

    if sponsor_data.empty:
        flash('Sponsor no encontrado.', 'danger')
        return redirect(url_for('manage_sponsors'))
    
    if request.method == 'POST':
        # ... (La lógica es idéntica a la de edit_profile, pero para sponsors)
        sponsor_index = sponsor_data.index[0]
        # ... (obtener datos del form, manejar uploads, actualizar df, guardar df)
        log_change(current_user.name, f"Editó al sponsor con ID {sponsor_id}")
        flash('Sponsor actualizado exitosamente!', 'success')
        return redirect(url_for('manage_sponsors'))

    return render_template('edit_sponsor.html', is_new=False, sponsor=sponsor_data.iloc[0].to_dict())

@app.route('/admin/sponsors/delete/<int:sponsor_id>', methods=['POST'])
@login_required
def delete_sponsor(sponsor_id):
    """Elimina un sponsor."""
    sponsors_df = pd.read_csv('database/sponsors.csv')
    sponsor_to_delete = sponsors_df[sponsors_df['id'] == sponsor_id]

    if not sponsor_to_delete.empty:
        sponsor_name = sponsor_to_delete.iloc[0]['name']
        sponsors_df = sponsors_df[sponsors_df['id'] != sponsor_id]
        sponsors_df.to_csv('database/sponsors.csv', index=False)
        log_change(current_user.name, f"Eliminó al sponsor '{sponsor_name}'")
        flash(f"Sponsor '{sponsor_name}' eliminado exitosamente.", 'success')
    else:
        flash('Sponsor no encontrado.', 'danger')
        
    return redirect(url_for('manage_sponsors'))

@app.route('/admin/team')
@admin_required
@login_required
def manage_team():
    """Muestra la lista de todos los integrantes para gestionarlos."""
    try:
        team_df = pd.read_csv('database/team.csv')
        team = team_df.to_dict(orient='records')
    except FileNotFoundError:
        team = []
    return render_template('manage_team.html', team=team)

@app.route('/admin/team/add', methods=['GET', 'POST'])
@admin_required
@login_required
def add_member():
    """Muestra el formulario para añadir un nuevo integrante y procesa el envío."""
    if request.method == 'POST':
        team_df = pd.read_csv('database/team.csv')
        new_id = team_df['id'].max() + 1 if not team_df.empty else 1
        
        new_member_data = {
            'id': new_id,
            'name': request.form.get('name'),
            'role': request.form.get('role'),
            'bio': request.form.get('bio'),
            'focus_areas': request.form.get('focus_areas'),
            'link_linkedin': request.form.get('link_linkedin'),
            'link_github': request.form.get('link_github'),
            'link_portfolio': request.form.get('link_portfolio'),
            'user_id': '' # Se deja vacío, se puede asignar después
        }
        
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                filename = secure_filename(f"member_{new_id}_{file.filename}")
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(save_path)
                new_member_data['image'] = save_path.replace('\\', '/')
        
        new_row = pd.DataFrame([new_member_data])
        team_df = pd.concat([team_df, new_row], ignore_index=True)
        team_df.to_csv('database/team.csv', index=False)
        
        log_change(current_user.name, f"Añadió al integrante '{new_member_data['name']}'")
        flash('Integrante añadido exitosamente!', 'success')
        return redirect(url_for('manage_team'))

    return render_template('edit_member.html', is_new=True, member={})

@app.route('/admin/team/edit/<int:member_id>', methods=['GET', 'POST'])
@admin_required
@login_required
def edit_member(member_id):
    """Muestra el formulario para editar un integrante y procesa el envío."""
    team_df = pd.read_csv('database/team.csv')
    member_data = team_df[team_df['id'] == member_id]

    if member_data.empty:
        flash('Integrante no encontrado.', 'danger')
        return redirect(url_for('manage_team'))
    
    if request.method == 'POST':
        member_index = member_data.index[0]
        for key in ['name', 'role', 'bio', 'focus_areas', 'link_linkedin', 'link_github', 'link_portfolio']:
            if key in request.form:
                team_df.loc[member_index, key] = request.form[key]
        
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                filename = secure_filename(f"member_{member_id}_{file.filename}")
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(save_path)
                team_df.loc[member_index, 'image'] = save_path.replace('\\', '/')
        
        team_df.to_csv('database/team.csv', index=False)
        log_change(current_user.name, f"Editó al integrante con ID {member_id}")
        flash('Integrante actualizado exitosamente!', 'success')
        return redirect(url_for('manage_team'))

    return render_template('edit_member.html', is_new=False, member=member_data.iloc[0].to_dict())

@app.route('/admin/team/delete/<int:member_id>', methods=['POST'])
@admin_required
@login_required
def delete_member(member_id):
    """Elimina un integrante."""
    team_df = pd.read_csv('database/team.csv')
    member_to_delete = team_df[team_df['id'] == member_id]

    if not member_to_delete.empty:
        member_name = member_to_delete.iloc[0]['name']
        team_df = team_df[team_df['id'] != member_id]
        team_df.to_csv('database/team.csv', index=False)
        log_change(current_user.name, f"Eliminó al integrante '{member_name}'")
        flash(f"Integrante '{member_name}' eliminado exitosamente.", 'success')
    else:
        flash('Integrante no encontrado.', 'danger')
        
    return redirect(url_for('manage_team'))

NEWS_FILE_PATH = 'database/news.json'

@app.route('/admin/news', methods=['GET', 'POST'])
@login_required
def edit_news():
    """Muestra y procesa el formulario para editar la noticia de inicio."""
    # Cargar los datos actuales de la noticia
    try:
        with open(NEWS_FILE_PATH, 'r', encoding='utf-8') as f:
            news_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Si el archivo no existe o está corrupto, empezamos con datos vacíos
        news_data = {}

    if request.method == 'POST':
        # Actualizar los datos con la información del formulario
        news_data['title'] = request.form.get('title')
        news_data['date'] = request.form.get('date')
        news_data['content'] = request.form.get('content')
        news_data['link'] = request.form.get('link')

        # Manejar la subida de la imagen
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(save_path)
                news_data['image'] = save_path.replace('\\', '/')
        
        # Guardar los datos actualizados de vuelta al archivo JSON
        with open(NEWS_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(news_data, f, indent=2, ensure_ascii=False)
        
        log_change(current_user.name, "Actualizó la noticia de la página de inicio")
        flash('La noticia ha sido actualizada exitosamente!', 'success')
        return redirect(url_for('edit_news'))

    return render_template('edit_news.html', news=news_data)

# =======================================================
# 5. RUTAS DE API (PARA DATOS)
# =======================================================

@app.route('/api/team')
def get_team_data():
    try:
        # Leemos el CSV y definimos los tipos de datos para prevenir errores
        df = pd.read_csv('database/team.csv', dtype={
            'user_id': 'Int64', # Usamos el tipo Int64 que soporta NaN
            'link_github': 'string',
            'link_linkedin': 'string',
            'link_portfolio': 'string'
        })
        
        # --- LA SOLUCIÓN DEFINITIVA PARA NaN ---
        # Reemplazamos todos los valores NaN/NaT en todo el DataFrame con None
        # El método .replace() es más explícito y robusto
        df = df.replace({np.nan: None})

        # Convertir 'focus_areas' de string a lista
        # También nos aseguramos de manejar el caso en que focus_areas sea None
        df['focus_areas'] = df['focus_areas'].apply(lambda x: x.split(';') if isinstance(x, str) else [])
        
        team_list = df.to_dict(orient='records')
        return jsonify(team_list)
        
    except FileNotFoundError:
        return jsonify({"error": "Team data not found"}), 404

    
@app.route('/api/sponsors')
def get_sponsors_data():
    try:
        df = pd.read_csv('database/sponsors.csv', dtype={'website': 'string'})
        
        # Aplicamos la misma limpieza robusta aquí
        df = df.replace({np.nan: None})

        sponsors_list = df.to_dict(orient='records')
        return jsonify(sponsors_list)
    except FileNotFoundError:
        return jsonify({"error": "Sponsors data not found"}), 404

@app.route('/admin/changelog')
@login_required
@admin_required # ¡Solo los administradores pueden ver el log!
def view_changelog():
    """Muestra el contenido del archivo de registro de cambios."""
    try:
        # Usamos Pandas para leer el CSV fácilmente
        log_df = pd.read_csv('database/changelog.csv')
        # Convertimos el DataFrame a una lista de diccionarios para Jinja
        logs = log_df.to_dict(orient='records')
    except FileNotFoundError:
        # Si el archivo no existe, pasamos una lista vacía
        logs = []
        flash("El archivo de registro de cambios aún no ha sido creado.", 'info')
    
    # Pasamos la lista de logs a la plantilla
    return render_template('changelog.html', logs=logs)

@app.route('/admin/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Muestra y procesa el formulario para cambiar la contraseña del usuario actual."""
    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        # 1. Validar que la contraseña actual es correcta
        if not check_password_hash(current_user.password_hash, current_password):
            flash('La contraseña actual es incorrecta.', 'danger')
            return redirect(url_for('change_password'))
            
        # 2. Validar que la nueva contraseña y la confirmación coincidan
        if new_password != confirm_password:
            flash('La nueva contraseña y la confirmación no coinciden.', 'danger')
            return redirect(url_for('change_password'))

        # 3. Hashear la nueva contraseña
        new_password_hash = generate_password_hash(new_password)

        # 4. Actualizar el archivo users.csv
        try:
            users_df = pd.read_csv('database/users.csv')
            user_index = users_df[users_df['id'] == current_user.id].index
            
            if not user_index.empty:
                users_df.loc[user_index, 'password_hash'] = new_password_hash
                users_df.to_csv('database/users.csv', index=False)
                
                log_change(current_user.name, "Cambió su contraseña")
                flash('¡Contraseña actualizada exitosamente!', 'success')
                return redirect(url_for('change_password'))
            else:
                flash('No se pudo encontrar tu usuario en la base de datos.', 'danger')

        except FileNotFoundError:
            flash('Error interno del servidor: no se encontró el archivo de usuarios.', 'danger')
        
        return redirect(url_for('change_password'))

    return render_template('change_password.html')

# --- Estado y Lógica de Telemetría ---
telemetry_state = { "status": "standby", "altitude": 0, "temperature": 25, "acceleration": 0, "pressure": 1013.25, "orientation": {"roll": 0, "pitch": 0, "yaw": 0}, "latitude": 19.5012, "longitude": -99.4520 }
simulation_running = False
simulation_time = 0

def run_simulation_step():
    """Modifica el estado global con un paso de la simulación."""
    global simulation_time, telemetry_state
    
    t = simulation_time
    
    # Modelo de vuelo simple
    if t < 10: # Fase de Impulso (Boost)
        telemetry_state["status"] = "en_vuelo"
        telemetry_state["acceleration"] = random.uniform(280, 320)
        telemetry_state["altitude"] += telemetry_state["acceleration"] / 10
    elif t < 20: # Fase de Inercia (Coast)
        telemetry_state["status"] = "en_vuelo"
        telemetry_state["acceleration"] -= random.uniform(30, 35)
    else: # Fase de Descenso
        telemetry_state["status"] = "descenso"
        telemetry_state["acceleration"] = -9.8
    
    # Actualizaciones de estado basadas en la física
    telemetry_state["altitude"] = max(0, telemetry_state["altitude"] + (telemetry_state["acceleration"] / 20))
    telemetry_state["pressure"] = 1013.25 * (1 - (telemetry_state["altitude"] / 44330))**5.255
    telemetry_state["temperature"] -= random.uniform(0.05, 0.1)
    
    # Actualizaciones de GPS
    telemetry_state["latitude"] += 0.0001 * random.random()
    telemetry_state["longitude"] -= 0.0001 * random.random()
    
    # Simular orientación (Roll, Pitch, Yaw)
    telemetry_state["orientation"]["pitch"] = telemetry_state["altitude"] / 1000
    telemetry_state["orientation"]["roll"] =  math.sin(telemetry_state["altitude"] / 100) * 5 # Multiplicamos para que sea más visible
    telemetry_state["orientation"]["yaw"] += random.uniform(-0.1, 0.1)

    simulation_time += 1

@app.route('/api/telemetry-stream')
def telemetry_stream():
    def generate():
        while True:
            if simulation_running: run_simulation_step()
            yield f"data: {json.dumps(telemetry_state)}\n\n"
            time.sleep(0.5)
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/ingest', methods=['POST'])
def ingest_telemetry():
    global telemetry_state
    data = request.get_json()
    if not data or data.get("api_key") != SECRET_API_KEY:
        return jsonify({"error": "Clave de API inválida o no hay datos"}), 403
    # ... (actualizar telemetry_state y log_to_csv)
    return jsonify({"message": "Datos recibidos"}), 200

@app.route('/api/start-simulation', methods=['POST'])
def start_simulation():
    global simulation_running, simulation_time
    simulation_running = True
    simulation_time = 0
    return jsonify({"message": "Simulación iniciada"})

@app.route('/api/stop-simulation', methods=['POST'])
def stop_simulation():
    global simulation_running
    simulation_running = False
    telemetry_state["status"] = "standby"
    return jsonify({"message": "Simulación detenida"})


# =======================================================
# 6. INICIO DE LA APLICACIÓN
# =======================================================
if __name__ == '__main__':
    app.run(debug=True, port=5001)