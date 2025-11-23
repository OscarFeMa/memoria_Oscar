// Memoria Oscar - Interfaz Mejorada con Archivos
console.log("Memoria Oscar - Interfaz con archivos cargada");

let sesionesActuales = [];
let archivosActuales = [];

// Función para alternar visibilidad de archivos
function toggleArchivos() {
    const lista = document.getElementById('listaArchivos');
    const boton = document.querySelector('.toggle-archivos');
    
    if (lista.style.display === 'none') {
        lista.style.display = 'block';
        boton.textContent = '📁 Ocultar Archivos Originales';
        cargarArchivos();
    } else {
        lista.style.display = 'none';
        boton.textContent = '📁 Mostrar Archivos Originales';
    }
}

// Cargar lista de archivos disponibles - VERSIÓN CORREGIDA
async function cargarArchivos() {
    try {
        console.log("Cargando archivos desde /api/archivos-disponibles...");
        const response = await fetch('/api/archivos-disponibles');
        
        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }
        
        const data = await response.json();
        console.log("Datos recibidos:", data);
        
        // VERIFICACIÓN CORREGIDA - acceder a data.archivos correctamente
        if (data && data.archivos && Array.isArray(data.archivos)) {
            console.log("Archivos recibidos:", data.archivos.length);
            archivosActuales = data.archivos;
            mostrarArchivos(archivosActuales);
        } else {
            throw new Error('Estructura de datos inválida: ' + JSON.stringify(data));
        }
        
    } catch (error) {
        console.error('Error cargando archivos:', error);
        document.getElementById('contenidoArchivos').innerHTML = 
            '<p style="color: red;">Error cargando archivos: ' + error.message + '</p>';
    }
}

// Mostrar archivos en la interfaz
function mostrarArchivos(archivos) {
    const contenedor = document.getElementById('contenidoArchivos');
    
    if (!archivos || !Array.isArray(archivos) || archivos.length === 0) {
        contenedor.innerHTML = '<p>No hay archivos disponibles</p>';
        return;
    }
    
    const html = archivos.map(archivo => {
        const tamanioMB = (archivo.tamanio / 1024 / 1024).toFixed(2);
        const fechaMod = new Date(archivo.modificado).toLocaleDateString('es-ES');
        const icono = archivo.tipo === 'PDF' ? '📄' : archivo.tipo === 'HTML' ? '🌐' : '📝';
        
        return `
            <div class="archivo-item">
                <div class="archivo-nombre">${icono} ${archivo.nombre}</div>
                <div class="archivo-info">
                    ${archivo.tipo} • ${tamanioMB} MB • ${fechaMod}
                </div>
                <div class="archivo-acciones">
                    <a href="${archivo.ruta}" target="_blank" class="btn-archivo ${
                        archivo.tipo === 'PDF' ? 'btn-pdf' : ''
                    }">
                        🔗 Abrir Original
                    </a>
                    <button class="btn-archivo" onclick="buscarEnArchivo('${archivo.nombre.replace(/'/g, "\\'")}')">
                        🔍 Buscar en este archivo
                    </button>
                    <button class="btn-archivo" onclick="probarArchivo('${archivo.nombre.replace(/'/g, "\\'")}')">
                        🧪 Probar Acceso
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    contenedor.innerHTML = html;
}

// Función para probar acceso a archivo
function probarArchivo(nombreArchivo) {
    const url = `/archivos/${encodeURIComponent(nombreArchivo)}`;
    console.log("Probando acceso a:", url);
    
    fetch(url)
        .then(response => {
            if (response.ok) {
                alert(`✅ Archivo accesible: ${nombreArchivo}\nPuedes abrirlo normalmente.`);
            } else {
                alert(`❌ Error ${response.status}: No se puede acceder a ${nombreArchivo}`);
            }
        })
        .catch(error => {
            alert(`❌ Error de red: ${error.message}`);
        });
}

// Buscar conversaciones de un archivo específico
function buscarEnArchivo(nombreArchivo) {
    document.getElementById('busqueda').value = `archivo:"${nombreArchivo}"`;
    buscarSesiones();
}

// [MANTENER EL RESTO DEL CÓDIGO IGUAL...]
async function buscarSesiones() {
    const query = document.getElementById('busqueda').value;
    console.log("Buscando sesiones:", query);
    
    if (!query.trim()) {
        document.getElementById('resultados').innerHTML = '<p>Por favor, ingresa algo para buscar</p>';
        return;
    }
    
    try {
        console.log("Buscando sesiones...");
        const response = await fetch('/api/sesiones?q=' + encodeURIComponent(query));
        
        if (!response.ok) {
            throw new Error('Error HTTP: ' + response.status);
        }
        
        const sesiones = await response.json();
        console.log("Sesiones encontradas:", sesiones.length);
        
        sesionesActuales = sesiones;
        mostrarSesiones(sesiones);
        
    } catch (error) {
        console.error('Error buscando sesiones:', error);
        document.getElementById('resultados').innerHTML = '<p>Error al buscar: ' + error.message + '</p>';
    }
}

function mostrarSesiones(sesiones) {
    const resultados = document.getElementById('resultados');
    
    if (sesiones.length === 0) {
        resultados.innerHTML = '<p>No se encontraron sesiones con esos términos.</p>';
        return;
    }
    
    const html = sesiones.map((sesion, index) => {
        const duracionMinutos = Math.round(sesion.duracion / (1000 * 60));
        const fecha = new Date(sesion.inicio).toLocaleDateString('es-ES');
        
        // Agregar enlace al archivo original si está disponible
        const archivoOriginal = archivosActuales.find(a => a.nombre === sesion.archivo);
        const enlaceArchivo = archivoOriginal ? 
            `<a href="${archivoOriginal.ruta}" target="_blank" style="margin-left: 10px; color: #2196F3;">📄 Abrir archivo original</a>` : 
            '';
        
        return `
            <div class="sesion" onclick="abrirSesion('${sesion.archivo.replace(/'/g, "\\'")}')">
                <div class="sesion-header">
                    <span class="sesion-archivo">${sesion.archivo}</span>
                    <span class="sesion-stats">
                        ${fecha} | ${sesion.total_mensajes} mensajes | ${duracionMinutos} min
                        ${enlaceArchivo}
                    </span>
                </div>
                <div class="sesion-stats">
                    🤖 Oscar: ${sesion.mensajes_oscar} | 🎯 Ancla: ${sesion.mensajes_ancla} |
                    Relevancia: ${sesion.relevancia} fragmentos
                </div>
                <div class="fragmentos">
                    ${sesion.fragmentos.map(fragmento => `
                        <div class="fragmento">
                            ${formatearFragmento(fragmento, document.getElementById('busqueda').value)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    resultados.innerHTML = html;
}

function formatearFragmento(fragmento, busqueda) {
    const regex = new RegExp(`(${busqueda})`, 'gi');
    const resaltado = fragmento.replace(regex, '<mark>$1</mark>');
    
    let emisorClass = 'ancla';
    let emisorIcon = '🎯';
    if (fragmento.match(/Oscar|IA|Assistant|DeepSeek/i) || fragmento.length > 100) {
        emisorClass = 'oscar';
        emisorIcon = '🤖';
    }
    
    return `<span class="emisor ${emisorClass}">${emisorIcon}</span> ${resaltado}`;
}

async function abrirSesion(archivo) {
    console.log("Abriendo sesión:", archivo);
    
    try {
        const response = await fetch('/api/sesion/' + encodeURIComponent(archivo));
        const sesionCompleta = await response.json();
        
        mostrarSesionCompleta(sesionCompleta);
        
    } catch (error) {
        console.error('Error cargando sesión:', error);
        alert('Error al cargar la sesión: ' + error.message);
    }
}

function mostrarSesionCompleta(sesion) {
    const modal = document.getElementById('modalSesion');
    const titulo = document.getElementById('modalTitulo');
    const contenido = document.getElementById('modalContenido');
    
    // Agregar enlace al archivo original en el modal
    const archivoOriginal = archivosActuales.find(a => a.nombre === sesion.archivo);
    const enlaceArchivo = archivoOriginal ? 
        `<a href="${archivoOriginal.ruta}" target="_blank" style="color: #2196F3; margin-left: 15px;">📄 Abrir archivo original</a>` : 
        '';
    
    titulo.innerHTML = `Conversación: ${sesion.archivo} (${sesion.total_mensajes} mensajes)${enlaceArchivo}`;
    
    const mensajesHTML = sesion.conversaciones.map(mensaje => {
        const emisorClass = mensaje.emisor === 'oscar' ? 'mensaje-oscar' : 'mensaje-ancla';
        const emisorIcon = mensaje.emisor === 'oscar' ? '🤖 Oscar' : '🎯 Ancla';
        const fecha = new Date(mensaje.timestamp).toLocaleString('es-ES');
        
        return `
            <div class="mensaje ${emisorClass}">
                <strong>${emisorIcon}:</strong> 
                <span>${mensaje.contenido}</span>
                <div class="timestamp">${fecha}</div>
            </div>
        `;
    }).join('');
    
    contenido.innerHTML = mensajesHTML;
    modal.style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalSesion').style.display = 'none';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, configurando eventos...');
    
    const busquedaInput = document.getElementById('busqueda');
    const buscarBtn = document.querySelector('button');
    
    if (busquedaInput) {
        busquedaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarSesiones();
            }
        });
    }
    
    if (buscarBtn) {
        buscarBtn.addEventListener('click', buscarSesiones);
    }
    
    // Cargar archivos al iniciar (pero ocultos)
    cargarArchivos();
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modalSesion');
        if (event.target === modal) {
            cerrarModal();
        }
    });
    
    console.log('Interfaz con archivos configurada');
});
