// Memoria Oscar - Interfaz Mejorada
console.log("Memoria Oscar - Interfaz de sesiones cargada");

let sesionesActuales = [];

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
        
        return `
            <div class="sesion" onclick="abrirSesion('${sesion.archivo}')">
                <div class="sesion-header">
                    <span class="sesion-archivo">${sesion.archivo}</span>
                    <span class="sesion-stats">
                        ${fecha} | ${sesion.total_mensajes} mensajes | ${duracionMinutos} min
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
    // Resaltar el término de búsqueda
    const regex = new RegExp(`(${busqueda})`, 'gi');
    const resaltado = fragmento.replace(regex, '<mark>$1</mark>');
    
    // Detectar emisor basado en contenido
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
    
    titulo.textContent = `Conversación: ${sesion.archivo} (${sesion.total_mensajes} mensajes)`;
    
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
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modalSesion');
        if (event.target === modal) {
            cerrarModal();
        }
    });
    
    console.log('Interfaz de sesiones configurada');
});
