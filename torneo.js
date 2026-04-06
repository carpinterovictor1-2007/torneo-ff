// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
const app = initializeApp(firebaseConfig); 
const db = getDatabase(app);
const auth = getAuth(app);
const torneosRef = ref(db, 'torneos');
const solicitudesRef = ref(db, 'solicitudes');

const btnSubmit = document.getElementById('btn-submit');
const adminLoginBtn = document.getElementById('admin-login');
const creatorBox = document.getElementById('creator-box');

/* --- Autenticación Google --- */
const provider = new GoogleAuthProvider();
let currentUser = null;
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');
const userProfile = document.getElementById('user-profile');
const misSolicitudesBox = document.getElementById('mis-solicitudes-box');

if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(error => {
            console.error(error);
            alert("Error al iniciar sesión con Google.");
        });
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth);
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        btnGoogleLogin.style.display = 'none';
        userProfile.style.display = 'flex';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL;
        
        misSolicitudesBox.style.display = 'block';
        if (window.renderMisSolicitudes) window.renderMisSolicitudes();
    } else {
        currentUser = null;
        btnGoogleLogin.style.display = 'flex';
        userProfile.style.display = 'none';
        misSolicitudesBox.style.display = 'none';
    }
});
/* --------------------------------- */

// Lógica para mostrar panel de creador solo al admin
if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
        const pass = prompt('Ingresa la clave secreta de administrador para crear torneos:');
        if (pass === '18072007v') {
            creatorBox.style.display = 'block';
            document.getElementById('solicitudes-box').style.display = 'block';
            window.isAdmin = true; // Para mostrar botón de borrar
            if (window.renderTorneos) window.renderTorneos(); // Redibujar con botones de borrar
            if (window.renderSolicitudes) window.renderSolicitudes(); // Imprimir panel solicitudes
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

        const fileInput = document.querySelector('input[name="Comprobante"]');
        const file = fileInput.files[0];
        
        if (!file) {
            alert("Sube el comprobante de pago por favor.");
            return;
        }

        document.getElementById('enroll-loading').style.display = 'block';
        document.getElementById('btn-confirm-enroll').disabled = true;

        const formData = new FormData(enrollForm);
        const playerNombre = formData.get('NombreJugador');
        const playerId = formData.get('ID_Jugador');
        const playerNequi = formData.get('Nequi_Referencia');
        const torneoName = formData.get('Torneo');

        // Usar FileReader para convertir la imagen a Base64 sin depender de Firebase Storage
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            
            // Guardar directamente en Realtime Database
            push(solicitudesRef, {
                torneo: torneoName,
                nombreJugador: playerNombre,
                idJugador: playerId,
                nequiReferencia: playerNequi,
                comprobante: base64Image,
                estado: 'pendiente',
                uid: currentUser.uid,        // Relacionar solicitud con el usuario
                email: currentUser.email,
                fecha: new Date().toISOString()
            }).then(() => {
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
            }).catch((error) => {
                console.error("Error al suscribirse:", error);
                alert("Hubo un error al enviar tu inscripción. Intenta de nuevo.");
                document.getElementById('enroll-loading').style.display = 'none';
                document.getElementById('btn-confirm-enroll').disabled = false;
            });
        };
        
        reader.onerror = function() {
            alert("Oops! Ocurrió un error leyendo tu imagen de Nequi.");
            document.getElementById('enroll-loading').style.display = 'none';
            document.getElementById('btn-confirm-enroll').disabled = false;
        };

        // Leer la imagen
        reader.readAsDataURL(file);
    });
}

function crearTorneo() {
    // Obtener valores de los inputs
    const nombre = document.getElementById('t-name').value;
    const modo = document.getElementById('t-mode').value;
    const formato = document.getElementById('t-format') ? document.getElementById('t-format').value : 'Solo';
    const mapa = document.getElementById('t-map').value;
    const premio = document.getElementById('t-prize').value;
    const inscripcion = document.getElementById('t-fee') ? document.getElementById('t-fee').value : '';
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
        formato: formato,
        mapa: mapa,
        premio: premio,
        inscripcion: inscripcion || 'Gratis',
        inscritos: 0,
        fechaTorneo: fecha,
        fechaPublicacion: new Date().toISOString()
    }).then(() => {
        alert("¡Torneo publicado en la nube con éxito!");
        document.getElementById('t-name').value = "";
        document.getElementById('t-prize').value = "";
        if (document.getElementById('t-fee')) document.getElementById('t-fee').value = "";
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
    if (!currentUser) {
        alert("¡Alto ahí! Debes iniciar sesión con Google arriba a la derecha para inscribirte.");
        return;
    }

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

// Función para actualizar inscritos
window.actualizarInscritos = function(key) {
    const val = document.getElementById('inp-count-' + key).value;
    update(ref(db, 'torneos/' + key), {
        inscritos: parseInt(val)
    }).then(() => {
        alert("¡Cupos actualizados correctamente!");
    }).catch(e => {
        alert("Error al actualizar: " + e);
    });
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
                        <span>👥 FORMATO: ${(t.formato || 'Solo').toUpperCase()}</span>
                        <span>🗺️ MAPA: ${(t.mapa || 'Cualquiera').toUpperCase()}</span>
                        <span>🏆 PREMIO: ${t.premio || 'Sorpresa'}</span>
                        <span>💲 INSCRIPCIÓN: ${t.inscripcion || 'Gratis'}</span>
                        <span style="color: #00ff00; font-weight: bold; font-size: 1rem; margin-top: 5px;">🔥 CUPOS: ${t.inscritos || 0} / 50</span>
                    </div>
            `;
            
            // Lógica para deshabilitar botón si está lleno (opcional, pero visualmente lo indicamos)
            if ((t.inscritos || 0) >= 50) {
                html += `<button class="btn-action" disabled style="background:#555; cursor:not-allowed;">Torneo Lleno</button>`;
            } else {
                html += `<button class="btn-action" onclick="unirse(this)">Participar</button>`;
            }

            // Si es admin, agregar panel de control
            if (window.isAdmin) {
                html += `
                    <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid #ffcc00; border-radius: 5px;">
                        <label style="color:#ffcc00; font-size:0.8rem; display:block; margin-bottom:5px;">Actualizar Inscritos (Max 50):</label>
                        <div style="display:flex; gap:5px;">
                            <input type="number" id="inp-count-${key}" value="${t.inscritos || 0}" max="50" min="0" style="width: 60px; padding: 5px; background: #222; color: white; border: 1px solid #444;">
                            <button onclick="actualizarInscritos('${key}')" style="background:#00ff00; color:black; border:none; padding:5px; cursor:pointer; font-weight:bold; flex-grow:1;">Guardar Cupos</button>
                        </div>
                        <button class="btn-action" onclick="borrarTorneo('${key}')" 
                                style="background: #ff4655; width: 100%; margin-top: 10px; padding: 8px;">
                            Eliminar Torneo
                        </button>
                    </div>
                `;
            }

            html += `</div>`;
            card.innerHTML = html;
            lista.appendChild(card);
        });
    }
};

let solicitudesData = null;

// Cargar Solicitudes
onValue(solicitudesRef, (snapshot) => {
    solicitudesData = snapshot.val();
    if (window.isAdmin && window.renderSolicitudes) {
        window.renderSolicitudes();
    }
    if (currentUser && window.renderMisSolicitudes) {
        window.renderMisSolicitudes();
    }
});

// Renderizar las solicitudes personales del usuario logueado
window.renderMisSolicitudes = function() {
    const sBox = document.getElementById('mis-solicitudes-list');
    if(!sBox) return;
    sBox.innerHTML = "";
    
    if (solicitudesData && currentUser) {
        let empty = true;
        Object.entries(solicitudesData).reverse().forEach(([key, s]) => {
            if (s.uid === currentUser.uid) {
                empty = false;
                const dv = document.createElement('div');
                let bgColor = "#161d24";
                let statusText = "Pendiente ⏳";
                let statusColor = "#ffcc00"; // amarillo
                
                if (s.estado === 'aceptada') {
                    bgColor = "rgba(0, 255, 0, 0.1)";
                    statusText = "Aceptada ✔️";
                    statusColor = "#00ff00";
                } else if (s.estado === 'rechazada') {
                    bgColor = "rgba(255, 0, 0, 0.1)";
                    statusText = "Rechazada ❌";
                    statusColor = "#ff4655";
                }
                
                dv.style = `background: ${bgColor}; border: 1px solid ${statusColor}; padding: 15px; border-radius: 5px;`;
                
                let html = `
                    <h4 style="color:var(--primary-yellow); margin-bottom:5px;">Torneo: ${s.torneo}</h4>
                    <p><strong>Jugador:</strong> ${s.nombreJugador}</p>
                    <p style="margin-top:10px;"><strong>Estado: <span style="color: ${statusColor};">${statusText}</span></strong></p>
                `;
                
                dv.innerHTML = html;
                sBox.appendChild(dv);
            }
        });
        if (empty) sBox.innerHTML = "<p>Aún no tienes solicitudes de torneos.</p>";
    } else {
        sBox.innerHTML = "<p>Aún no tienes solicitudes de torneos.</p>";
    }
};

// Aceptar solicitud
window.aceptarSolicitud = function(reqKey, torneoName) {
    if(!confirm("¿Aprobarás esta solicitud?")) return;
    
    // Cambiar estado a 'aceptada'
    update(ref(db, `solicitudes/${reqKey}`), { estado: 'aceptada' })
    .then(() => {
        // Encontrar torneo por nombre y sumar +1
        if (torneosData) {
            let foundTournamentId = null;
            let currentInscritos = 0;
            Object.entries(torneosData).forEach(([key, t]) => {
                if (t.nombre === torneoName) {
                    foundTournamentId = key;
                    currentInscritos = t.inscritos || 0;
                }
            });
            if (foundTournamentId) {
                update(ref(db, `torneos/${foundTournamentId}`), { inscritos: currentInscritos + 1 });
            }
        }
        alert("Solicitud Aceptada y cupos actualizados.");
    }).catch(e => alert("Error: " + e));
};

// Rechazar solicitud
window.rechazarSolicitud = function(reqKey) {
    if(confirm("¿Estás seguro de RECHAZAR esta solicitud?")) {
        update(ref(db, `solicitudes/${reqKey}`), { estado: 'rechazada' });
    }
};

window.renderSolicitudes = function() {
    const sBox = document.getElementById('solicitudes-list');
    if(!sBox) return;
    sBox.innerHTML = "";

    if (solicitudesData) {
        let empty = true;
        Object.entries(solicitudesData).reverse().forEach(([key, s]) => {
            if (s.estado === 'pendiente') {
                empty = false;
                const dv = document.createElement('div');
                dv.style = "background: #111; border: 1px solid #444; padding: 15px; border-radius: 5px; display: flex; gap: 15px; align-items: start; flex-wrap: wrap;";
                
                dv.innerHTML = `
                    <div style="flex: 1; min-width: 200px;">
                        <h4 style="color:var(--primary-yellow); margin-bottom:5px;">Torneo: ${s.torneo}</h4>
                        <p><strong>Jugador:</strong> ${s.nombreJugador}</p>
                        <p><strong>ID:</strong> ${s.idJugador}</p>
                        <p><strong>Nequi Ref:</strong> ${s.nequiReferencia}</p>
                        <div style="margin-top: 10px; display: flex; gap: 10px;">
                            <button onclick="aceptarSolicitud('${key}', '${s.torneo}')" style="background:#00ff00; color:#000; padding:8px 15px; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Aceptar ✔️</button>
                            <button onclick="rechazarSolicitud('${key}')" style="background:#ff4655; color:#fff; padding:8px 15px; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Rechazar ❌</button>
                        </div>
                    </div>
                    <div style="flex: 1; text-align:right;">
                        <a href="${s.comprobante}" target="_blank">
                            <img src="${s.comprobante}" style="max-height: 150px; border: 2px solid #555; border-radius: 5px;" alt="Comprobante">
                        </a>
                    </div>
                `;
                sBox.appendChild(dv);
            }
        });
        if (empty) sBox.innerHTML = "<p style='color: white;'>No hay solicitudes pendientes.</p>";
    } else {
        sBox.innerHTML = "<p style='color: white;'>No hay solicitudes pendientes.</p>";
    }
};