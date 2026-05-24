// ============================================================
//  TALLER DE TECNOLOGÍA — Sala Digital José de San Martín
//  app.js
//
//  ▶ IMPORTANTE: reemplaza la URL de abajo con la URL real
//    de tu Web App de Google Apps Script después de publicar.
//    Implementar → Nueva implementación → Aplicación web
//    Ejecutar como: Yo | Acceso: Cualquier usuario
// ============================================================

var GAS_URL   = 'https://script.google.com/macros/s/AKfycbyDKujbhDXjE4X5GDuHAGA_oeRmADKHhLzyfJgkVFR1mAWL8S_WwRjzj_xjG9POA9H_/exec';
var MAX_CUPOS = 15;

var BTN_LABEL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="white">'
              + '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>'
              + '</svg> Inscribirse al Taller';

// ── Inicialización ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
  cargarContador();
  document.getElementById('fechaNacimiento')
          .setAttribute('max', new Date().toISOString().split('T')[0]);
});

// ── Contador de cupos ───────────────────────────────────────
function cargarContador() {
  fetch(GAS_URL + '?action=count')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) actualizarContador(data.count);
    })
    .catch(function (e) { console.error('Error al cargar contador:', e); });
}

function actualizarContador(count) {
  var left = Math.max(0, MAX_CUPOS - count);
  var pct  = (left / MAX_CUPOS) * 100;
  var pill = document.getElementById('counter-pill');
  var fill = document.getElementById('progress-fill');

  document.getElementById('cupos-left').textContent = left;
  fill.style.width = pct + '%';

  if (left <= 0) {
    mostrarSinCupos();
  } else if (left <= 3) {
    pill.textContent  = '¡Últimos cupos!';
    pill.className    = 'counter-pill danger';
    fill.style.background = 'linear-gradient(90deg,#dc2626,#f87171)';
  } else if (left <= 6) {
    pill.textContent  = '¡Pocos Cupos!';
    pill.className    = 'counter-pill warning';
    fill.style.background = 'linear-gradient(90deg,#ea580c,#fb923c)';
  }
}

function mostrarSinCupos() {
  document.getElementById('form-section').style.display = 'none';
  document.getElementById('no-cupos').style.display     = 'block';
  document.getElementById('counter-pill').textContent   = 'Sin cupos';
  document.getElementById('counter-pill').className     = 'counter-pill danger';
  document.getElementById('cupos-left').textContent     = '0';
  var fill = document.getElementById('progress-fill');
  fill.style.width      = '0%';
  fill.style.background = 'linear-gradient(90deg,#dc2626,#f87171)';
}

// ── Validaciones ────────────────────────────────────────────
function soloLetras(i) {
  i.value = i.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/g, '');
}
function soloNumeros(i) {
  i.value = i.value.replace(/[^0-9]/g, '');
}

function setError(id, msg) {
  var inp = document.getElementById(id);
  var err = document.getElementById('err-' + id);
  if (msg) {
    inp.classList.add('error');
    if (err) err.textContent = msg;
    return false;
  }
  inp.classList.remove('error');
  if (err) err.textContent = '';
  return true;
}

function validarCampo(input) {
  var id  = input.id;
  var val = input.value.trim();

  if (!val) return setError(id, 'Este campo es requerido.');

  if (id === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
    return setError(id, 'Ingrese un correo válido.');

  if (id === 'cedula'   && val.length < 6)
    return setError(id, 'Mínimo 6 dígitos.');

  if (id === 'telefono' && val.length < 7)
    return setError(id, 'Teléfono inválido.');

  if (id === 'fechaNacimiento') {
    var d = new Date(val), hoy = new Date();
    if (d >= hoy) return setError(id, 'Debe ser anterior a hoy.');
  }

  return setError(id, '');
}

function validarTodo() {
  var ok = true;
  ['nombre', 'apellido', 'cedula', 'telefono', 'correo', 'fechaNacimiento']
    .forEach(function (id) {
      if (!validarCampo(document.getElementById(id))) ok = false;
    });
  return ok;
}

// ── Envío del formulario ────────────────────────────────────
function submitForm() {
  if (!validarTodo()) {
    showToast('error', '⚠️', 'Corrija los errores antes de continuar.');
    return;
  }

  var btn = document.getElementById('btn-submit');
  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner"></div> Registrando...';

  var payload = {
    action: 'register',
    data: {
      nombre:          document.getElementById('nombre').value.trim(),
      apellido:        document.getElementById('apellido').value.trim(),
      telefono:        document.getElementById('telefono').value.trim(),
      cedula:          document.getElementById('cedula').value.trim(),
      correo:          document.getElementById('correo').value.trim(),
      fechaNacimiento: document.getElementById('fechaNacimiento').value
    }
  };

  // GAS no acepta Content-Type: application/json en doPost cross-origin.
  // Se envía como text/plain y se parsea con JSON.parse en el servidor.
  fetch(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload)
  })
  .then(function (r) { return r.json(); })
  .then(handleResponse)
  .catch(handleError);
}

function handleResponse(res) {
  var btn = document.getElementById('btn-submit');
  btn.disabled  = false;
  btn.innerHTML = BTN_LABEL;

  if (res.success) {
    showToast('success', '✅', res.message);
    limpiarFormulario();
    actualizarContador(res.count);
    if (res.remaining <= 0) setTimeout(mostrarSinCupos, 1500);
  } else if (res.duplicate) {
    showToast('warning', '⚠️', res.message);
    document.getElementById('cedula').classList.add('error');
    document.getElementById('err-cedula').textContent = 'Cédula ya registrada.';
  } else {
    showToast('error', '❌', res.message || 'Error desconocido.');
  }
}

function handleError(err) {
  var btn = document.getElementById('btn-submit');
  btn.disabled  = false;
  btn.innerHTML = BTN_LABEL;
  showToast('error', '❌', 'Error de conexión. Intente nuevamente.');
  console.error(err);
}

function limpiarFormulario() {
  ['nombre', 'apellido', 'telefono', 'cedula', 'correo', 'fechaNacimiento']
    .forEach(function (id) {
      var el  = document.getElementById(id);
      var err = document.getElementById('err-' + id);
      el.value = '';
      el.classList.remove('error');
      if (err) err.textContent = '';
    });
}

// ── Toast ───────────────────────────────────────────────────
var _toastTimer;
function showToast(type, icon, msg) {
  var t = document.getElementById('toast');
  clearTimeout(_toastTimer);
  t.className = '';
  void t.offsetWidth; // reflow para reiniciar animación
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent  = msg;
  t.className = type + ' show';
  _toastTimer = setTimeout(function () {
    t.classList.remove('show');
  }, 4500);
}
