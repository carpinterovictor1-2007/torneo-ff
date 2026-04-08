// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
const ganadoresRef = ref(db, 'ganadores');

const btnSubmit = document.getElementById('btn-submit');
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
        if (window.location.protocol === 'file:') {
            alert("⚠️ CUIDADO: Firebase y Google bloquean el inicio de sesión si abres el archivo dando doble clic (file://). \n\nPara que el inicio de sesión de Google pueda funcionar, necesitas usar un servidor web local (por ejemplo, instalar la extensión 'Live Server' en VSCode y abrir la página con ella) o publicar la página en internet.");
            return;
        }

        signInWithPopup(auth, provider).catch(error => {
            console.error(error);
            alert("Error al iniciar sesión con Google: " + error.message);
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
        userProfile.className = 'user-profile-visible';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL;
        
        // Auto-asignación de permisos de administrador para tu correo maestro
        if (user.email && user.email.toLowerCase().trim() === 'carpinterovictor1@gmail.com') {
            window.isAdmin = true;
            creatorBox.style.display = 'block';
            document.getElementById('solicitudes-box').style.display = 'block';
            if (window.renderSolicitudes) window.renderSolicitudes();
            if (window._insertarBotonLimpiarChat) window._insertarBotonLimpiarChat();
            if (window.renderTorneos) window.renderTorneos();

            if (!window.hasShownAdminWelcome) {
                alert("¡Bienvenido, Administrador Maestro Victor!");
                window.hasShownAdminWelcome = true;
            }
        }

        misSolicitudesBox.style.display = 'block';
        if (window.renderMisSolicitudes) window.renderMisSolicitudes();
        
        const chatInp = document.getElementById('chat-input');
        const chatBt = document.getElementById('chat-btn');
        if (chatInp && chatBt) {
            chatInp.disabled = false;
            chatBt.disabled = false;
            chatInp.placeholder = "Escribe un mensaje... (Máx 50 caract.)";
        }
    } else {
        currentUser = null;
        btnGoogleLogin.style.display = '';
        userProfile.className = 'user-profile-hidden';
        misSolicitudesBox.style.display = 'none';
        
        // Quitar permisos de admin si sale de su sesión
        window.isAdmin = false;
        creatorBox.style.display = 'none';
        document.getElementById('solicitudes-box').style.display = 'none';

        // Quitar botón limpiar chat si existe
        const btnLimpiar = document.getElementById('btn-limpiar-chat');
        if (btnLimpiar) btnLimpiar.remove();

        const chatInp = document.getElementById('chat-input');
        const chatBt = document.getElementById('chat-btn');
        if (chatInp && chatBt) {
            chatInp.disabled = true;
            chatBt.disabled = true;
            chatInp.placeholder = "Inicia sesión para escribir... (Máx 50 caract.)";
        }
    }
    // Refrescar torneos para bloquear botones si ya estaban inscritos
    if (window.renderTorneos) window.renderTorneos();
});
/* --------------------------------- */

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
            
            // Revisión final de seguridad para evitar dobles inscripciones (Backend validation)
            let yaExiste = false;
            if (currentUser && window.solicitudesDataGlobal) {
                Object.values(window.solicitudesDataGlobal).forEach(s => {
                    if (s.uid === currentUser.uid && (s.torneo || '').toLowerCase() === (torneoName || '').toLowerCase()) {
                        yaExiste = true;
                    }
                });
            }

            if (yaExiste) {
                alert("¡Error de sistema! Ya estabas registrado o tienes una solicitud previa para este torneo exacto.");
                document.getElementById('enroll-loading').style.display = 'none';
                document.getElementById('btn-confirm-enroll').disabled = false;
                return;
            }
            
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
    
    lista.innerHTML = "";
    if (torneosData) {
        Object.entries(torneosData).reverse().forEach(([key, t]) => {
            const card = document.createElement('div');
            card.className = 'tournament-card';

            // Formatear la fecha si existe
            let fechaStr = "Por anunciar";
            if (t.fechaTorneo) {
                const f = new Date(t.fechaTorneo);
                fechaStr = f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
                           ' · ' + f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            // Elegir ícono de mapa
            const mapIcons = { 'Bermuda': '🏝️', 'Purgatorio': '🌋', 'Kalahari': '🏜️', 'Alpes': '🏔️' };
            const mapIcon = mapIcons[t.mapa] || '🗺️';
            const modeIcons = { 'Clásico': '🎯', 'Duelo de Escuadras': '⚔️', 'Lobo Solitario': '🐺' };
            const modeIcon = modeIcons[t.modo] || '🎮';
            const formatIcons = { 'Solo': '👤', 'Dúo': '👥', 'Escuadra': '👪' };
            const formatIcon = formatIcons[t.formato] || '👥';

            // Calcular porcentaje de cupos
            const cupos = t.inscritos || 0;
            const maxCupos = 50;
            const pct = Math.round((cupos / maxCupos) * 100);
            const cuposColor = pct >= 80 ? '#ff4655' : pct >= 50 ? '#ffcc00' : '#00e676';

            let html = `
                <div class="status-badge">ACTIVO</div>
                <div class="card-header">
                    <div class="card-header-icon">${modeIcon}</div>
                    <div class="card-header-text">${(t.nombre || 'TORN').substring(0, 4).toUpperCase()}</div>
                </div>
                <div class="card-body">
                    <h3>${(t.nombre || '').toUpperCase()}</h3>
                    <div class="card-info">
                        <span>🗓️ <strong>Fecha:</strong> ${fechaStr}</span>
                        <span>${modeIcon} <strong>Modo:</strong> ${t.modo || 'Clásico'}</span>
                        <span>${formatIcon} <strong>Formato:</strong> ${t.formato || 'Solo'}</span>
                        <span>${mapIcon} <strong>Mapa:</strong> ${t.mapa || 'Cualquiera'}</span>
                        <span>🏆 <strong>Premio:</strong> ${t.premio || 'Sorpresa'}</span>
                        <span>💲 <strong>Inscripción:</strong> ${t.inscripcion || 'Gratis'}</span>
                        <span class="highlight-stat" style="color:${cuposColor};">🔥 Cupos: ${cupos} / ${maxCupos}</span>
                    </div>
                    <div style="margin-top:10px;height:4px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${cuposColor},${cuposColor}88);border-radius:4px;transition:width 0.5s ease;"></div>
                    </div>
            `;

            // Verificar si el usuario ya está inscrito o tiene solicitud pendiente
            let yaInscrito = false;
            let solicitudPendiente = false;
            if (currentUser && window.solicitudesDataGlobal) {
                Object.values(window.solicitudesDataGlobal).forEach(s => {
                    if (s.uid === currentUser.uid && (s.torneo || '').toLowerCase() === (t.nombre || '').toLowerCase()) {
                        if (s.estado === 'aceptada') yaInscrito = true;
                        if (s.estado === 'pendiente') solicitudPendiente = true;
                    }
                });
            }

            if (yaInscrito) {
                html += `<button class="btn-action" disabled style="background:rgba(0,230,118,0.15);color:#00e676;border:1px solid rgba(0,230,118,0.3);font-weight:700;cursor:not-allowed;letter-spacing:1px;">✔️ Ya Estás Inscrito</button>`;
            } else if (solicitudPendiente) {
                html += `<button class="btn-action" disabled style="background:rgba(255,204,0,0.12);color:#ffcc00;border:1px solid rgba(255,204,0,0.3);font-weight:700;cursor:not-allowed;letter-spacing:1px;">⏳ En Revisión</button>`;
            } else if (cupos >= maxCupos) {
                html += `<button class="btn-action" disabled style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.3);cursor:not-allowed;letter-spacing:1px;">🔒 Torneo Lleno</button>`;
            } else {
                html += `<button class="btn-action" onclick="unirse(this)">⚔️ Participar Ahora</button>`;
            }

            // Panel de control para admin
            if (window.isAdmin) {
                html += `
                    <div style="margin-top:18px;padding:14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,204,0,0.2);border-radius:10px;">
                        <label style="color:#ffcc00;font-size:0.72rem;display:block;margin-bottom:8px;letter-spacing:2px;font-weight:700;">PANEL ADMIN — CUPOS</label>
                        <div style="display:flex;gap:8px;">
                            <input type="number" id="inp-count-${key}" value="${cupos}" max="50" min="0" style="width:70px;padding:8px;background:rgba(0,0,0,0.5);color:white;border:1px solid rgba(255,255,255,0.15);border-radius:6px;font-family:'Outfit',sans-serif;">
                            <button onclick="actualizarInscritos('${key}')" style="background:linear-gradient(135deg,#00c853,#00a040);color:#000;border:none;padding:8px 12px;cursor:pointer;font-weight:700;font-family:'Outfit',sans-serif;font-size:0.8rem;border-radius:6px;flex-grow:1;letter-spacing:0.5px;transition:opacity 0.2s;">Guardar Cupos</button>
                        </div>
                        <button class="btn-action" onclick="borrarTorneo('${key}')" style="background:rgba(255,70,85,0.15);color:#ff4655;border:1px solid rgba(255,70,85,0.3);width:100%;margin-top:10px;">
                            🗑️ Eliminar Torneo
                        </button>
                    </div>
                `;
            }

            html += `</div>`;
            card.innerHTML = html;
            lista.appendChild(card);
        });
    } else {
        lista.innerHTML = `<p style='color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px 0;font-size:1rem;'>No hay torneos activos en este momento. ¡Vuelve pronto! ⚔️</p>`;
    }
};

window.torneosDataGlobal = null;
window.solicitudesDataGlobal = null;

// Cargar Solicitudes
onValue(solicitudesRef, (snapshot) => {
    window.solicitudesDataGlobal = snapshot.val();
    if (window.isAdmin && window.renderSolicitudes) {
        window.renderSolicitudes();
    }
    if (currentUser && window.renderMisSolicitudes) {
        window.renderMisSolicitudes();
    }
    // Refrescar botones de torneo para reflejar si está inscrito en alguno de ellos
    if (window.renderTorneos) window.renderTorneos();
});

// Renderizar las solicitudes personales del usuario logueado
window.renderMisSolicitudes = function() {
    const sBox = document.getElementById('mis-solicitudes-list');
    if(!sBox) return;
    sBox.innerHTML = "";
    
    if (window.solicitudesDataGlobal && currentUser) {
        let empty = true;
        Object.entries(window.solicitudesDataGlobal).reverse().forEach(([key, s]) => {
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
                if ((t.nombre || '').toLowerCase() === (torneoName || '').toLowerCase()) {
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

    if (window.solicitudesDataGlobal) {
        let empty = true;
        Object.entries(window.solicitudesDataGlobal).reverse().forEach(([key, s]) => {
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

// Cargar y Renderizar Campeones
onValue(ganadoresRef, (snapshot) => {
    const data = snapshot.val();
    renderGanadores(data);
});

function renderGanadores(data) {
    const list = document.getElementById('champions-list');
    if (!list) return;
    list.innerHTML = "";
    
    if (data) {
        Object.entries(data).reverse().forEach(([key, g]) => {
            const card = document.createElement('div');
            card.className = 'champion-card';
            
            card.innerHTML = `
                <div class="champion-icon">🏆</div>
                <div class="champion-name">${g.nombre || 'Desconocido'}</div>
                <div class="champion-tournament">${g.torneo || 'Torneo'}</div>
                <div class="champion-prize">${g.premio || 'Premio'}</div>
            `;
            list.appendChild(card);
        });
    } else {
        list.innerHTML = "<p style='color: #888; grid-column: 1 / -1; text-align: center;'>Aún no hay campeones registrados.</p>";
    }
}

// =============================================
// FILTRO DE PALABRAS OFENSIVAS
// =============================================
const PALABRAS_PROHIBIDAS = [
    // Español
    'mierda', 'puta', 'puto', 'hijueputa', 'hijueptas', 'marica', 'malparido', 'malparida',
    'gonorrea', 'hp', 'hdp', 'culero', 'culo', 'verga', 'pene', 'coño', 'cono',
    'pendejo', 'pendeja', 'idiota', 'imbécil', 'imbecil', 'estúpido', 'estupido',
    'bastardo', 'bastarda', 'perra', 'perro', 'negro', 'marico', 'maricon', 'maricón',
    'sicario', 'asesino', 'maldito', 'maldita', 'jodete', 'jódete', 'cabron', 'cabrón',
    'chinga', 'chingada', 'chingado', 'pinche', 'güey', 'guey', 'wey', 'carajo',
    'joder', 'coger', 'follar', 'mamada', 'culiao', 'culeado', 'huevon', 'huevón',
    'maricon', 'trolo', 'pito', 'picho', 'concha', 'tetas', 'porno',
    // Inglés
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'cunt', 'dick',
    'nigga', 'nigger', 'faggot', 'retard', 'whore', 'slut', 'pussy', 'cock',
    'ass', 'wtf', 'stfu'
];

function censurarTexto(texto) {
    if (!texto) return texto;
    let resultado = texto;
    PALABRAS_PROHIBIDAS.forEach(palabra => {
        // Regex con variaciones: letras repetidas, mayúsculas, con/sin tildes
        const regex = new RegExp(palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const censura = '*'.repeat(palabra.length);
        resultado = resultado.replace(regex, censura);
    });
    return resultado;
}

function contieneOfensa(texto) {
    if (!texto) return false;
    const lower = texto.toLowerCase();
    return PALABRAS_PROHIBIDAS.some(p => lower.includes(p));
}

// =============================================
// LÓGICA DEL CHAT
// =============================================
const chatRef = ref(db, 'chat');
const chatMessagesContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatBtn = document.getElementById('chat-btn');

// Botón "Limpiar Chat" solo visible para admin
window.limpiarChatAdmin = function() {
    if (!window.isAdmin) return;
    if (!confirm('⚠️ ¿Estás seguro de que quieres BORRAR todo el chat global?')) return;
    remove(ref(db, 'chat'))
        .then(() => console.log('Chat limpiado correctamente.'))
        .catch(e => alert('Error al limpiar el chat: ' + e));
};

// Borrar un mensaje individual (solo admin)
window.borrarMensajeChat = function(key) {
    if (!window.isAdmin) return;
    remove(ref(db, 'chat/' + key))
        .catch(e => console.error('Error al borrar mensaje:', e));
};

if (chatRef && chatMessagesContainer) {
    const chatQuery = query(chatRef, limitToLast(50));
    onValue(chatQuery, (snapshot) => {
        chatMessagesContainer.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.entries(data).forEach(([key, msg]) => {
                const div = document.createElement('div');
                div.className = 'chat-msg';
                div.style.position = 'relative';

                if (currentUser && currentUser.uid === msg.uid) {
                    div.classList.add('me');
                }

                const b = document.createElement('b');
                b.className = 'chat-user';
                b.textContent = (msg.nombre || 'Anónimo') + ':';

                const span = document.createElement('span');
                // Mostrar texto censurado visualmente (aunque en Firebase está el original)
                span.textContent = ' ' + censurarTexto(msg.texto);

                div.appendChild(b);
                div.appendChild(span);

                // Botón de borrar solo para admin
                if (window.isAdmin) {
                    const delBtn = document.createElement('button');
                    delBtn.className = 'chat-delete-btn';
                    delBtn.innerHTML = '🗑';
                    delBtn.title = 'Borrar mensaje';
                    delBtn.onclick = () => window.borrarMensajeChat(key);
                    div.appendChild(delBtn);
                }

                chatMessagesContainer.appendChild(div);
            });
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        } else {
            chatMessagesContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px 0;">¡Sé el primero en saludar! 👋</p>';
        }
    });
}

function enviarMensajeChat() {
    if (!currentUser || !chatInput || chatInput.value.trim() === '') return;
    const textoOriginal = chatInput.value.trim();
    if (textoOriginal.length > 50) return;

    // Bloquear envío si contiene ofensas graves (opcional: en su lugar se podría solo censurar)
    // Aquí optamos por enviar el texto censurado directamente
    const textoCensurado = censurarTexto(textoOriginal);

    chatInput.disabled = true;
    if (chatBtn) chatBtn.disabled = true;

    push(chatRef, {
        uid: currentUser.uid,
        nombre: currentUser.displayName || 'Soldado',
        texto: textoCensurado,   // Se guarda ya censurado
        timestamp: new Date().toISOString()
    }).then(() => {
        chatInput.value = '';
    }).catch((e) => {
        console.error('Error enviando chat: ', e);
    }).finally(() => {
        chatInput.disabled = false;
        if (chatBtn) chatBtn.disabled = false;
        chatInput.focus();
    });
}

if (chatBtn) chatBtn.addEventListener('click', enviarMensajeChat);
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensajeChat();
    });
}

// Mostrar el botón "Limpiar Chat" cuando el admin inicia sesión
// (Se llama desde onAuthStateChanged cuando se detecta admin)
window._insertarBotonLimpiarChat = function() {
    const chatHeader = document.querySelector('.chat-container .section-title');
    if (!chatHeader || document.getElementById('btn-limpiar-chat')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-limpiar-chat';
    btn.textContent = '🗑️ Limpiar Chat';
    btn.title = 'Borrar todos los mensajes del chat';
    btn.style.cssText = `
        background: rgba(255,70,85,0.12);
        color: #ff4655;
        border: 1px solid rgba(255,70,85,0.3);
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: 'Outfit', sans-serif;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.3s;
        margin-left: auto;
    `;
    btn.onmouseenter = () => {
        btn.style.background = '#ff4655';
        btn.style.color = 'white';
    };
    btn.onmouseleave = () => {
        btn.style.background = 'rgba(255,70,85,0.12)';
        btn.style.color = '#ff4655';
    };
    btn.onclick = window.limpiarChatAdmin;
    // Insertar antes del ::after del section-title
    chatHeader.appendChild(btn);
};