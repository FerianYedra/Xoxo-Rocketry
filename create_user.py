# create_user.py (Versión 3.0 - Con Asignación de Roles)

import pandas as pd
from werkzeug.security import generate_password_hash
import getpass
import numpy as np
import os

USERS_DB_PATH = 'database/users.csv'
TEAM_DB_PATH = 'database/team.csv'

def add_user_and_link_profile():
    print("--- Creación y Asignación de Usuario ---")

    # --- Cargar y preparar datos ---
    try:
        users_df = pd.read_csv(USERS_DB_PATH)
        next_user_id = users_df['id'].max() + 1 if not users_df.empty else 1
    except FileNotFoundError:
        users_df = pd.DataFrame(columns=['id', 'username', 'password_hash', 'name', 'role'])
        next_user_id = 1

    try:
        team_df = pd.read_csv(TEAM_DB_PATH)
    except FileNotFoundError:
        print(f"Error: El archivo {TEAM_DB_PATH} no existe. No se puede asignar un perfil.")
        return

    # --- 1. Crear el nuevo usuario ---
    username = input("Introduce el nombre de usuario para el login: ")
    if username in users_df['username'].values:
        print("Error: El nombre de usuario ya existe.")
        return
        
    password = getpass.getpass("Introduce la contraseña: ")
    password_confirm = getpass.getpass("Confirma la contraseña: ")
    if password != password_confirm:
        print("Error: Las contraseñas no coinciden.")
        return
    
    name_for_login = input("Introduce el nombre completo del usuario (para el log): ")
    
    # --- Asignación de Rol ---
    role = ''
    while role not in ['admin', 'member']:
        role = input("Introduce el rol del usuario ('admin' o 'member'): ").lower()
    
    password_hash = generate_password_hash(password)

    new_user = pd.DataFrame([{
        'id': next_user_id,
        'username': username,
        'password_hash': password_hash,
        'name': name_for_login,
        'role': role
    }])
    users_df = pd.concat([users_df, new_user], ignore_index=True)
    users_df.to_csv(USERS_DB_PATH, index=False)
    print(f"\nUsuario '{username}' ({role}) creado exitosamente con el ID {next_user_id}.")

    # --- 2. Asignar el nuevo usuario a un perfil de equipo ---
    link_profile_choice = input("¿Deseas asignar este usuario a un perfil de equipo ahora? (s/n): ").lower()
    if link_profile_choice != 's':
        print("Operación completada.")
        return

    print("\n--- Asignación de Perfil de Equipo ---")
    
    unassigned_members = team_df[team_df['user_id'].apply(lambda x: np.isnan(x) if isinstance(x, float) else pd.isna(x))]
    
    if unassigned_members.empty:
        print("No hay perfiles de equipo sin asignar.")
        return

    print("Selecciona el perfil de equipo para asignar a este nuevo usuario:")
    for index, row in unassigned_members.iterrows():
        print(f"  [{row['id']}] {row['name']} ({row['role']})")

    try:
        team_id_to_link = int(input("Introduce el ID del miembro del equipo (o 0 para omitir): "))
        if team_id_to_link == 0:
            print("Asignación de perfil omitida.")
            return
    except ValueError:
        print("Error: Debes introducir un número.")
        return

    if team_id_to_link not in unassigned_members['id'].values:
        print("Error: ID de miembro de equipo no válido o ya asignado.")
        return
        
    target_index = team_df[team_df['id'] == team_id_to_link].index
    team_df.loc[target_index, 'user_id'] = next_user_id
    team_df.to_csv(TEAM_DB_PATH, index=False)
    
    linked_member_name = team_df.loc[target_index, 'name'].iloc[0]
    print(f"\n¡Éxito! El usuario '{username}' ha sido asignado al perfil de '{linked_member_name}'.")


if __name__ == '__main__':
    add_user_and_link_profile()