// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCG8ioQRyNIcm4oQr7MK3sUV9gbdZVuzGw",
    authDomain: "torneo-ff-1e98d.firebaseapp.com",
    databaseURL: "https://torneo-ff-1e98d-default-rtdb.firebaseio.com",
    projectId: "torneo-ff-1e98d",
    storageBucket: "torneo-ff-1e98d.firebasestorage.app",
    messagingSenderId: "1063147228009",
    appId: "1:1063147228009:web:c3a4d1625498627ee9cbf8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig); const db = getDatabase(app);
const torneosRef = ref(db, 'torneos');

const btnSubmit = document.getElementById('btn-submit');
const adminLoginBtn = document.getElementById('admin-login');
const creatorBox = document.getElementById('creator-box');

// Lógica para mostrar panel de creador solo al admin
if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
        const pass = prompt('Ingresa la clave secreta de administrador para crear torneos:');
        if (pass === '18072007v') {
            creatorBox.style.display = 'block';
            window.isAdmin = true; // Para mostrar botón de borrar
            if (window.renderTorneos) window.renderTorneos(); // Redibujar con botones de borrar
            alert('¡Acceso concedido, Victor! Panel de creación habilitado.');
        } else if (pass !== null) {
            alert('Clave incorrecta. Solo el dueño puede crear torneos.');
        }
    });
}

if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
        crearTorneo();
    });
}

// Lógica del Modal
const closeModalBtn = document.getElementById('close-modal-btn');
const modal = document.getElementById('join-modal');
const enrollForm = document.getElementById('enroll-form');

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
}

// Envío del formulario
if (enrollForm) {
    enrollForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Obfuscation básica del correo para evitar bots de scraping
        const emailPart1 = "carpinterovictor1";
        const emailPart2 = "gmail.com";
        const target = `https://formsubmit.co/ajax/${emailPart1}@${emailPart2}`;

        const formData = new FormData(enrollForm);
        // Ocultar captcha default de FormSubmit ya que usamos AJAX
        formData.append('_captcha', 'false');

        document.getElementById('enroll-loading').style.display = 'block';
        document.getElementById('enroll-success').style.display = 'none';
        document.getElementById('btn-confirm-enroll').disabled = true;

        fetch(target, {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById('enroll-loading').style.display = 'none';
                document.getElementById('enroll-success').style.display = 'block';

                if (selectedBtn) {
                    selectedBtn.innerText = "¡EN REVISIÓN!";
                    selectedBtn.style.background = "#ffcc00"; // Yellow
                    selectedBtn.style.color = "black";
                    selectedBtn.disabled = true;
                }

                setTimeout(() => {
                    modal.classList.remove('active');
                    enrollForm.reset();
                    document.getElementById('enroll-success').style.display = 'none';
                    document.getElementById('btn-confirm-enroll').disabled = false;
                }, 3000);
            })
            .catch(error => {
                alert("Hubo un error al enviar tu inscripción. Intenta de nuevo.");
                document.getElementById('enroll-loading').style.display = 'none';
                document.getElementById('btn-confirm-enroll').disabled = false;
            });
    });
}

function crearTorneo() {
    // Obtener valores de los inputs
    const nombre = document.getElementById('t-name').value;
    const modo = document.getElementById('t-mode').value;
    const mapa = document.getElementById('t-map').value;
    const premio = document.getElementById('t-prize').value;
    const dateInput = document.getElementById('t-date');
    const fecha = dateInput && dateInput.value ? dateInput.value : '';

    // Validación simple
    if (nombre.trim() === "" || premio.trim() === "") {
        alert("¡Soldado! Necesitas poner un nombre y un premio para el torneo.");
        return;
    }

    // Guardar en Firebase
    push(torneosRef, {
        nombre: nombre,
        modo: modo,
        mapa: mapa,
        premio: premio,
        fechaTorneo: fecha,
        fechaPublicacion: new Date().toISOString()
    }).then(() => {
        alert("¡Torneo publicado en la nube con éxito!");
        document.getElementById('t-name').value = "";
        document.getElementById('t-prize').value = "";
        if (dateInput) dateInput.value = "";
    }).catch((error) => {
        console.error("Error al guardar:", error);
        alert("Error al conectar con Firebase. Revisa la consola.");
    });
}

// Variable global para recordar qué botón se presionó
let selectedBtn = null;

// Función para abrir modal y participar
window.unirse = function(btn) {
    selectedBtn = btn;
    const cardBody = btn.parentElement;
    const tName = cardBody.querySelector('h3').innerText;

    // Configurar modal
    document.getElementById('modal-tournament-name').innerText = tName;
    document.getElementById('f-tournament-name').value = tName;

    // Mostrar modal
    const modal = document.getElementById('join-modal');
    modal.classList.add('active');
};

// Función global para borrar torneos
window.borrarTorneo = function(key) {
    if (confirm("¿Estás seguro de que quieres eliminar este torneo?")) {
        remove(ref(db, 'torneos/' + key)).then(() => {
            alert("Torneo eliminado correctamente.");
        }).catch((error) => {
            console.error("Error al borrar:", error);
            alert("No se pudo eliminar el torneo.");
        });
    }
};

let torneosData = null;

// Cargar Torneos desde Firebase en tiempo real
onValue(torneosRef, (snapshot) => {
    torneosData = snapshot.val();
    if (window.renderTorneos) window.renderTorneos();
});

window.renderTorneos = function() {
    const lista = document.getElementById('tournament-list');
    if (!lista) return;
    
    lista.innerHTML = ""; // Limpiar lista
    if (torneosData) {
        // Mostrar últimos torneos primero
        Object.entries(torneosData).reverse().forEach(([key, t]) => {
            const card = document.createElement('div');
            card.className = 'tournament-card';
            
            // Formatear la fecha si existe
            let fechaStr = "Por anunciar";
            if (t.fechaTorneo) {
                const f = new Date(t.fechaTorneo);
                fechaStr = f.toLocaleDateString() + ' ' + f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            let html = `
                <div class="status-badge" style="background: #ffcc00">ACTIVO</div>
                <div class="card-header" style="background: linear-gradient(45deg, #1f2933, #ff4655)">
                    ${(t.nombre || 'TORN').substring(0, 4).toUpperCase()}
                </div>
                <div class="card-body">
                    <h3>${(t.nombre || '').toUpperCase()}</h3>
                    <div class="card-info">
                        <span>🗓️ FECHA: ${fechaStr}</span>
                        <span>🎮 MODO: ${(t.modo || 'Clásico').toUpperCase()}</span>
                        <span>🗺️ MAPA: ${(t.mapa || 'Cualquiera').toUpperCase()}</span>
                        <span>🏆 PREMIO: ${t.premio || 'Sorpresa'}</span>
                    </div>
                    <button class="btn-action" onclick="unirse(this)">Participar</button>
            `;

            // Si es admin, agregar botón de borrar
            if (window.isAdmin) {
                html += `
                    <button class="btn-action" onclick="borrarTorneo('${key}')" 
                            style="background: #ff4655; margin-top: 10px; opacity: 0.9;">
                        Eliminar Torneo
                    </button>
                `;
            }

            html += `</div>`;
            card.innerHTML = html;
            lista.appendChild(card);
        });
    }
};