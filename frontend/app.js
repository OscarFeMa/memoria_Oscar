console.log("app.js cargado - versión tradicional");

function buscar() {
    var query = document.getElementById('busqueda').value;
    console.log("Buscando: " + query);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/recuerdos?q=' + encodeURIComponent(query), true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var conversaciones = JSON.parse(xhr.responseText);
            console.log("Encontradas " + conversaciones.length + " conversaciones");
            var resultados = document.getElementById('resultados');
            resultados.innerHTML = '';
            conversaciones.forEach(function(conv) {
                var div = document.createElement('div');
                div.className = 'conversacion ' + conv.emisor;
                div.innerHTML = '<strong>' + (conv.emisor === 'oscar' ? '🤖 Oscar' : '🎯 Ancla') + ':</strong> ' + conv.contenido + '<div class="timestamp">' + new Date(conv.timestamp).toLocaleString('es-ES') + '</div>';
                resultados.appendChild(div);
            });
        } else {
            console.error('Error en la solicitud: ' + xhr.status);
        }
    };
    xhr.send();
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado");
    document.getElementById('busqueda').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscar();
        }
    });
    document.querySelector('button').addEventListener('click', buscar);
});
