document.addEventListener('DOMContentLoaded', () => {
    const btnSubmit = document.getElementById('btn-submit');

    btnSubmit.addEventListener('click', () => {
        crearTorneo();
    });

    // Lógica del Modal
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modal = document.getElementById('join-modal');
    const enrollForm = document.getElementById('enroll-form');
    
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Envío del formulario
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
            
            if(selectedBtn) {
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
});

function crearTorneo() {
    // Obtener valores de los inputs
    const nombre = document.getElementById('t-name').value;
    const modo = document.getElementById('t-mode').value;
    const mapa = document.getElementById('t-map').value;
    const premio = document.getElementById('t-prize').value;

    // Validación simple
    if (nombre.trim() === "" || premio.trim() === "") {
        alert("¡Soldado! Necesitas poner un nombre y un premio para el torneo.");
        return;
    }

    const lista = document.getElementById('tournament-list');

    // Crear el elemento de la tarjeta
    const card = document.createElement('div');
    card.className = 'tournament-card';

    // Generar contenido dinámico
    card.innerHTML = `
        <div class="status-badge" style="background: #ffcc00">NUEVO</div>
        <div class="card-header" style="background: linear-gradient(45deg, #1f2933, #ff4655)">
            ${nombre.substring(0, 4).toUpperCase()}
        </div>
        <div class="card-body">
            <h3>${nombre.toUpperCase()}</h3>
            <div class="card-info">
                <span>MODO: ${modo.toUpperCase()}</span>
                <span>MAPA: ${mapa.toUpperCase()}</span>
                <span>PREMIO: ${premio}</span>
            </div>
            <button class="btn-action" onclick="unirse(this)">Participar</button>
        </div>
    `;

    // Efecto de entrada (Fade in)
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";

    lista.prepend(card);

    setTimeout(() => {
        card.style.transition = "all 0.5s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
    }, 50);

    // Limpiar el formulario
    document.getElementById('t-name').value = "";
    document.getElementById('t-prize').value = "";
}

// Variable global para recordar qué botón se presionó
let selectedBtn = null;

// Función para abrir modal y participar
function unirse(btn) {
    selectedBtn = btn;
    const cardBody = btn.parentElement;
    const tName = cardBody.querySelector('h3').innerText;
    
    // Configurar modal
    document.getElementById('modal-tournament-name').innerText = tName;
    document.getElementById('f-tournament-name').value = tName;
    
    // Mostrar modal
    const modal = document.getElementById('join-modal');
    modal.classList.add('active');
}