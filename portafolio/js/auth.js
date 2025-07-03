// Registrar un nuevo usuario (solo admin)
async function registerUser(email, password, name, role) {
    return new Promise((resolve, reject) => {
        // Validar rol
        if (!['admin', 'docente', 'evaluador'].includes(role)) {
            reject(new Error('Rol no válido'));
            return;
        }
        
        // Hash de la contraseña
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Insertar en la base de datos
            db.run(
                `INSERT INTO users (email, password, name, role) 
                 VALUES (?, ?, ?, ?)`,
                [email, hash, name, role],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.lastID);
                }
            );
        });
    });
}

// Iniciar sesión
async function loginUser(email, password) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT id, email, password, name, role 
             FROM users 
             WHERE email = ?`,
            [email],
            (err, user) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!user) {
                    reject(new Error('Usuario no encontrado'));
                    return;
                }
                
                // Verificar contraseña
                bcrypt.compare(password, user.password, (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (!result) {
                        reject(new Error('Contraseña incorrecta'));
                        return;
                    }
                    
                    // Eliminar password del objeto usuario
                    delete user.password;
                    resolve(user);
                });
            }
        );
    });
}

// Cerrar sesión
function logoutUser() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Actualizar el menú de navegación según el usuario
function updateNavMenu(user) {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;
    
    navMenu.innerHTML = '';
    
    const ul = document.createElement('ul');
    
    // Elementos comunes
    const homeLi = document.createElement('li');
    homeLi.innerHTML = '<a href="index.html">Inicio</a>';
    ul.appendChild(homeLi);
    
    // Elementos según rol
    if (user.role === 'admin') {
        const cursosLi = document.createElement('li');
        cursosLi.innerHTML = '<a href="cursos.html">Cursos</a>';
        ul.appendChild(cursosLi);
        
        const usuariosLi = document.createElement('li');
        usuariosLi.innerHTML = '<a href="usuarios.html">Usuarios</a>';
        ul.appendChild(usuariosLi);
    } else if (user.role === 'docente') {
        const portafolioLi = document.createElement('li');
        portafolioLi.innerHTML = '<a href="portafolio.html">Portafolio</a>';
        ul.appendChild(portafolioLi);
        
        const archivosLi = document.createElement('li');
        archivosLi.innerHTML = '<a href="archivos.html">Archivos</a>';
        ul.appendChild(archivosLi);
    } else if (user.role === 'evaluador') {
        const evaluacionesLi = document.createElement('li');
        evaluacionesLi.innerHTML = '<a href="evaluaciones.html">Evaluaciones</a>';
        ul.appendChild(evaluacionesLi);
    }
    
    // Cerrar sesión
    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = '<a href="#" id="logout-link">Cerrar Sesión</a>';
    ul.appendChild(logoutLi);
    
    navMenu.appendChild(ul);
    
    // Evento para cerrar sesión
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }
}

// Actualizar información del usuario en la interfaz
function updateUserInfo(user) {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) return;
    
    userInfo.innerHTML = `
        <div class="user-avatar">${user.name.charAt(0)}</div>
        <span>${user.name} (${user.role})</span>
    `;
}