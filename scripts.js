/**
 * Mi Web Profesional - Scripts
 * Funciones para gestionar el inicio de sesión, navegación y contenido
 */

// Manejo de contenido y navegación
function showContent(section) {
    document.querySelectorAll('.content').forEach(div => div.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    // Cerrar el menú después de seleccionar una opción
    document.getElementById("menu").style.display = "none";
}

// Gestión de alertas
function showAlert(message, type = "success") {
    var alertBox = document.getElementById("alertBox");
    alertBox.innerText = message;
    
    // Restablecer todas las clases y luego añadir la correcta
    alertBox.className = "alert";
    if(type === "error") {
        alertBox.classList.add("error");
    } else if(type === "warning") {
        alertBox.classList.add("warning");
    }
    
    alertBox.style.display = "block";
    alertBox.style.opacity = "1";
    
    setTimeout(() => {
        alertBox.style.opacity = "0";
        setTimeout(() => {
            alertBox.style.display = "none";
        }, 500);
    }, 3000);
}

// Funciones de autenticación
function hashPassword(password) {
    return btoa(password);
}

function login() {
    var user = document.getElementById("username").value;
    var pass = document.getElementById("password").value;
    
    if (!user || !pass) {
        showAlert("Por favor, completa todos los campos", "error");
        return;
    }
    
    var storedUser = localStorage.getItem("user");
    var storedPass = localStorage.getItem("pass");
    
    if (storedUser && storedPass) {
        if (user === storedUser && hashPassword(pass) === storedPass) {
            showAlert("Inicio de sesión exitoso");
            sessionStorage.setItem("loggedIn", "true");
            updateUI();
        } else {
            showAlert("Usuario o contraseña incorrectos", "error");
        }
    } else {
        showAlert("No hay usuarios registrados, creando uno", "warning");
        localStorage.setItem("user", user);
        localStorage.setItem("pass", hashPassword(pass));
        showAlert("Usuario registrado con éxito, ahora inicia sesión");
    }
}

function logout() {
    sessionStorage.removeItem("loggedIn");
    showAlert("Has cerrado sesión correctamente");
    updateUI();
}

// Actualización de la interfaz según el estado de la sesión
function updateUI() {
    let isLoggedIn = sessionStorage.getItem("loggedIn");
    
    // Mostrar/ocultar formulario de login y botón de logout
    document.getElementById("login").style.display = isLoggedIn ? "none" : "block";
    document.getElementById("logout").style.display = isLoggedIn ? "inline-block" : "none";
    
    // Ocultar todas las opciones del menú cuando el usuario no está logado
    const menuItems = document.querySelectorAll('.menu a, .dropdown-toggle');
    menuItems.forEach(item => {
        if (item.id !== "logout") {
            item.style.display = isLoggedIn ? "block" : "none";
        }
    });
    
    // Ocultar también los submenús cuando el usuario no está logado
    const subMenus = document.querySelectorAll('.dropdown-menu');
    subMenus.forEach(subMenu => {
        subMenu.style.display = "none";
    });
    
    // Desactivar el botón del menú hamburguesa si no está logado
    const hamburgerBtn = document.querySelector('.hamburger');
    hamburgerBtn.style.display = isLoggedIn ? "block" : "none";
    
    // Mostrar contenido de inicio si está logeado
    if (isLoggedIn) {
        showContent('inicio');
    } else {
        // Ocultar todos los contenidos si no está logado
        document.querySelectorAll('.content').forEach(div => div.classList.remove('active'));
    }
}

// Gestión del menú
function toggleMenu() {
    var menu = document.getElementById("menu");
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function toggleSubMenu(id) {
    var subMenu = document.getElementById(id);
    var currentDisplay = subMenu.style.display;
    var toggle = document.querySelector(`[data-target="${id}"]`);
    
    if (currentDisplay === "block") {
        subMenu.style.display = "none";
        toggle.classList.remove("active");
    } else {
        subMenu.style.display = "block";
        toggle.classList.add("active");
    }
}

// Gestión de perfil y credenciales
function changeCredentials() {
    var newUser = document.getElementById("newUsername").value;
    var newPass = document.getElementById("newPassword").value;
    var confirmPass = document.getElementById("confirmPassword").value;
    
    if (!newUser || !newPass || !confirmPass) {
        showAlert("Por favor, completa todos los campos", "error");
        return;
    }
    
    if (newPass !== confirmPass) {
        showAlert("Las contraseñas no coinciden", "error");
        return;
    }
    
    // Guardar nuevas credenciales
    localStorage.setItem("user", newUser);
    localStorage.setItem("pass", hashPassword(newPass));
    
    // Limpiar campos
    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    
    showAlert("Credenciales actualizadas correctamente");
}

// Inicialización al cargar la página
document.addEventListener("DOMContentLoaded", function() {
    // Evento para permitir login con Enter
    document.getElementById("password").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            login();
        }
    });
    
    // Inicializar UI
    updateUI();
});

/**
 * Funciones para gestionar contenedores Docker
 */

// Ejecutar comandos Docker
function executeDockerCommand(command) {
    // Verificar que el usuario esté logueado
    if (!sessionStorage.getItem("loggedIn")) {
        showAlert("Debes iniciar sesión para ejecutar comandos", "error");
        return;
    }

    const outputElement = document.getElementById("dockerCommandOutput");
    outputElement.innerHTML = "Ejecutando comando: docker " + command + "...";

    // Realizar petición a la API con opciones mejoradas
    fetch('./docker-api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ command: command }),
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Error respuesta:', response.status, text);
                throw new Error(`Error en la respuesta del servidor (${response.status})`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Mostrar resultado en el área de salida
        displayDockerOutput(data.output, command);
    })
    .catch(error => {
        console.error('Error:', error);
        outputElement.innerHTML = `<div class="command-error">Error: ${error.message}</div>`;
        showAlert("Error al ejecutar el comando Docker: " + error.message, "error");
    });
}
// Mostrar datos en el área de salida
function displayDockerOutput(output, command) {
    const outputElement = document.getElementById("dockerCommandOutput");

    // Formatear la salida según el tipo de comando
    if (command === 'ps') {
        outputElement.innerHTML = formatDockerPs(output);
    } else if (command === 'images') {
        outputElement.innerHTML = formatDockerImages(output);
    } else if (command.startsWith('restart')) {
        outputElement.innerHTML = `<div class="command-success">${output}</div>`;
        showAlert("Contenedor reiniciado correctamente", "success");
    } else {
        outputElement.innerHTML = `<div class="command-result">${output}</div>`;
    }
}

// Formatear salida de docker ps para una mejor visualización
function formatDockerPs(output) {
    const lines = output.split('\n');
    let formattedOutput = '<div class="command-title">CONTENEDORES EN EJECUCIÓN</div>\n';

    if (lines.length <= 1) {
        return formattedOutput + '<div class="command-empty">No hay contenedores en ejecución</div>';
    }

    // Crear una tabla para mejor visualización
    formattedOutput += '<table class="docker-table">\n';
    
    lines.forEach((line, index) => {
        if (index === 0) {
            // Procesar encabezados
            const headers = line.trim().split(/\s{2,}/);
            formattedOutput += '<thead><tr>';
            headers.forEach(header => {
                formattedOutput += `<th>${header}</th>`;
            });
            formattedOutput += '<th>ACCIÓN</th></tr></thead>\n<tbody>';
        } else if (line.trim() !== '') {
            // Dividir la línea en columnas (respetando los espacios)
            const columns = line.trim().split(/\s{2,}/);
            
            // Extraer el ID del contenedor para el botón de reinicio
            const containerId = columns[0];
            
            formattedOutput += '<tr>';
            columns.forEach(column => {
                formattedOutput += `<td>${column}</td>`;
            });
            formattedOutput += `<td><button onclick="promptSpecificContainerRestart('${containerId}')" class="restart-btn">Reiniciar</button></td></tr>\n`;
        }
    });
    
    formattedOutput += '</tbody></table>';
    return formattedOutput;
}

// Formatear salida de docker images para una mejor visualización
function formatDockerImages(output) {
    const lines = output.split('\n');
    let formattedOutput = '<div class="command-title">IMÁGENES DISPONIBLES</div>\n';

    if (lines.length <= 1) {
        return formattedOutput + '<div class="command-empty">No hay imágenes disponibles</div>';
    }

    // Crear una tabla para mejor visualización
    formattedOutput += '<table class="docker-table">\n';

    lines.forEach((line, index) => {
        if (index === 0) {
            // Procesar encabezados
            const headers = line.trim().split(/\s{2,}/);
            formattedOutput += '<thead><tr>';
            headers.forEach(header => {
                formattedOutput += `<th>${header}</th>`;
            });
            formattedOutput += '</tr></thead>\n<tbody>';
        } else if (line.trim() !== '') {
            // Dividir la línea en columnas (respetando los espacios)
            const columns = line.trim().split(/\s{2,}/);

            formattedOutput += '<tr>';
            columns.forEach(column => {
                formattedOutput += `<td>${column}</td>`;
            });
            formattedOutput += '</tr>\n';
        }
    });

    formattedOutput += '</tbody></table>';
    return formattedOutput;
}

// Limpiar área de salida
function clearDockerOutput() {
    document.getElementById("dockerCommandOutput").innerHTML = "Selecciona un comando para ver información de Docker...";
}

// Mostrar modal para reiniciar contenedor
function promptContainerRestart() {
    // Verificar que el usuario esté logueado
    if (!sessionStorage.getItem("loggedIn")) {
        showAlert("Debes iniciar sesión para ejecutar comandos", "error");
        return;
    }

    // Primero obtenemos la lista de contenedores para seleccionar
    executeDockerCommand('ps');

    // Crear modal si no existe
    if (!document.getElementById('dockerRestartModal')) {
        const modalHTML = `
            <div id="dockerRestartModal" class="docker-modal">
                <div class="docker-modal-content">
                    <h3>Reiniciar Contenedor Docker</h3>
                    <p>Ingresa el ID o nombre del contenedor que deseas reiniciar:</p>
                    <input type="text" id="containerId" placeholder="ID o nombre del contenedor">
                    <div class="docker-modal-buttons">
                        <button class="docker-modal-btn docker-modal-cancel" onclick="closeDockerModal()">Cancelar</button>
                        <button class="docker-modal-btn docker-modal-confirm" onclick="restartContainer()">Reiniciar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Mostrar modal
    document.getElementById('dockerRestartModal').style.display = 'flex';
}

// Reiniciar un contenedor específico directamente desde la lista
function promptSpecificContainerRestart(containerId) {
    if (!sessionStorage.getItem("loggedIn")) {
        showAlert("Debes iniciar sesión para ejecutar comandos", "error");
        return;
    }
    
    if (confirm(`¿Estás seguro de que deseas reiniciar el contenedor ${containerId}?`)) {
        executeDockerCommand(`restart ${containerId}`);
    }
}

// Cerrar modal de Docker
function closeDockerModal() {
    document.getElementById('dockerRestartModal').style.display = 'none';
}

// Reiniciar contenedor
function restartContainer() {
    const containerId = document.getElementById('containerId').value.trim();

    if (!containerId) {
        showAlert("Debes proporcionar un ID o nombre de contenedor", "error");
        return;
    }

    // Cerrar modal
    closeDockerModal();

    // Ejecutar comando de reinicio
    executeDockerCommand(`restart ${containerId}`);
}