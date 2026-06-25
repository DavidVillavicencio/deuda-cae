/* ===================================================
   CONFIGURACIÓN — Cámbiala con tus datos de Supabase
   =================================================== */
const SUPABASE_URL = 'https://djdkqeeuputslxixbuwf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZGtxZWV1cHV0c2x4aXhidXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNDY0MjksImV4cCI6MjA5NzkyMjQyOX0.aloaNuRYTHOOxLNDcp4zgZQbTHOq6f4bbDlGb43nCpQ'

/* ===================================================
   ESTADO GLOBAL
   =================================================== */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
let pinValido = false
let pinActual = ''
let pagoEditando = null

/* ===================================================
   UTILIDADES
   =================================================== */
function formatearCLP(monto) {
  return '$' + Math.round(monto).toLocaleString('es-CL')
}

function hoy() {
  return new Date().toISOString().split('T')[0]
}

function fechaLocal(fecha) {
  if (!fecha) return '-'
  const [y, m, d] = fecha.split('-')
  return `${d}-${m}-${y}`
}

function toast(msg, tipo) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = 'toast ' + (tipo || '') + ' show'
  clearTimeout(el._timer)
  el._timer = setTimeout(() => { el.className = 'toast' }, 3000)
}

/* ===================================================
   SUPABASE — FUNCIONES RPC
   =================================================== */
async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw new Error(error.message)
  return data
}

async function fetchDeuda() {
  const { data, error } = await supabase
    .from('deudas')
    .select('*')
    .eq('activa', true)
    .limit(1)
  if (error) throw new Error(error.message)
  return data && data.length > 0 ? data[0] : null
}

async function fetchPagos() {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .order('fecha', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

/* ===================================================
   RENDER
   =================================================== */
async function render() {
  let deuda, pagos

  try {
    deuda = await fetchDeuda()
    pagos = await fetchPagos()
  } catch (e) {
    document.getElementById('loading').style.display = 'none'
    document.getElementById('main-content').style.display = 'block'
    document.getElementById('config-message').style.display = 'block'
    document.getElementById('config-message').querySelector('.alert').textContent =
      'Error de conexión con Supabase. Verifica tu configuración en app.js'
    return
  }

  document.getElementById('loading').style.display = 'none'
  document.getElementById('main-content').style.display = 'block'

  const total = deuda ? deuda.total : 0
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0)
  const saldo = Math.max(0, total - totalPagado)
  const pct = total > 0 ? Math.min(100, (totalPagado / total) * 100) : 0

  document.getElementById('total').textContent = formatearCLP(total)
  document.getElementById('pagado').textContent = formatearCLP(totalPagado)
  document.getElementById('saldo').textContent = formatearCLP(saldo)
  document.getElementById('progress-fill').style.width = pct + '%'
  document.getElementById('progress-porcentaje').textContent = pct.toFixed(1) + '%'

  if (deuda && deuda.nombre) {
    document.getElementById('titulo').textContent = deuda.nombre
    document.getElementById('subtitulo').textContent =
      'Total: ' + formatearCLP(total) + ' — Saldo: ' + formatearCLP(saldo)
  } else {
    document.getElementById('titulo').textContent = 'Control de Deuda'
    document.getElementById('subtitulo').textContent = 'Lleva el control de tus pagos'
  }

  const msgConfig = document.getElementById('config-message')
  if (!deuda || total === 0) {
    msgConfig.style.display = 'block'
  } else {
    msgConfig.style.display = 'none'
  }

  renderHistorial(pagos)
}

function renderHistorial(pagos) {
  const tbody = document.getElementById('history-body')
  const thAcciones = document.getElementById('th-acciones')

  if (!pagos || pagos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No hay pagos registrados</td></tr>'
    thAcciones.style.display = 'none'
    return
  }

  if (pinValido) {
    thAcciones.style.display = ''
  } else {
    thAcciones.style.display = 'none'
  }

  tbody.innerHTML = pagos.map(p => {
    const acciones = pinValido
      ? `<div class="actions-cell">
          <button class="btn-secondary btn-small btn-edit" data-id="${p.id}">Editar</button>
          <button class="btn-secondary btn-small btn-delete" data-id="${p.id}">Eliminar</button>
         </div>`
      : ''
    return `<tr>
      <td>${fechaLocal(p.fecha)}</td>
      <td>${formatearCLP(p.monto)}</td>
      <td>${p.concepto || '-'}</td>
      <td class="admin-col">${acciones}</td>
    </tr>`
  }).join('')
}

/* ===================================================
   PIN
   =================================================== */
async function verificarPin() {
  const input = document.getElementById('pin-input')
  const pin = input.value.trim()
  const errorEl = document.getElementById('pin-error')

  if (!pin) {
    errorEl.textContent = 'Ingresa un PIN'
    errorEl.style.display = 'block'
    return
  }

  try {
    const valido = await rpc('verificar_pin', { pin_input: pin })
    if (valido) {
      pinValido = true
      pinActual = pin
      errorEl.style.display = 'none'
      document.getElementById('pin-section').style.display = 'none'
      document.getElementById('admin-content').style.display = 'block'
      input.value = ''
      render()
      toast('PIN correcto — modo administrador activado', 'success')
    } else {
      errorEl.textContent = 'PIN incorrecto'
      errorEl.style.display = 'block'
    }
  } catch (e) {
    errorEl.textContent = 'Error al verificar PIN: ' + e.message
    errorEl.style.display = 'block'
  }
}

function cerrarAdmin() {
  document.getElementById('admin-panel').style.display = 'none'
  pinValido = false
  pinActual = ''
  document.getElementById('pin-section').style.display = 'block'
  document.getElementById('admin-content').style.display = 'none'
  document.getElementById('pin-error').style.display = 'none'
  document.getElementById('pin-input').value = ''
  render()
}

/* ===================================================
   CRUD — PAGOS
   =================================================== */
async function agregarPago(e) {
  e.preventDefault()
  const monto = parseInt(document.getElementById('pago-monto').value, 10)
  const fecha = document.getElementById('pago-fecha').value || hoy()
  const concepto = document.getElementById('pago-concepto').value.trim()

  if (!monto || monto <= 0) {
    toast('Ingresa un monto válido', 'error')
    return
  }

  try {
    const res = await rpc('agregar_pago', {
      p_monto: monto,
      p_fecha: fecha,
      p_concepto: concepto,
      p_pin: pinActual,
    })
    if (res && res.success === false) {
      toast(res.error || 'Error al registrar pago', 'error')
      return
    }
    toast('Pago registrado correctamente', 'success')
    document.getElementById('form-pago').reset()
    document.getElementById('pago-fecha').value = ''
    await render()
  } catch (e) {
    toast('Error: ' + e.message, 'error')
  }
}

async function abrirEdicion(id) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    toast('Error al cargar pago', 'error')
    return
  }

  pagoEditando = data
  document.getElementById('edit-id').value = data.id
  document.getElementById('edit-monto').value = data.monto
  document.getElementById('edit-fecha').value = data.fecha
  document.getElementById('edit-concepto').value = data.concepto || ''
  document.getElementById('modal-overlay').style.display = 'flex'
}

async function guardarEdicion(e) {
  e.preventDefault()
  const id = parseInt(document.getElementById('edit-id').value, 10)
  const monto = parseInt(document.getElementById('edit-monto').value, 10)
  const fecha = document.getElementById('edit-fecha').value
  const concepto = document.getElementById('edit-concepto').value.trim()

  if (!monto || monto <= 0) {
    toast('Ingresa un monto válido', 'error')
    return
  }

  try {
    const res = await rpc('editar_pago', {
      p_id: id,
      p_monto: monto,
      p_fecha: fecha,
      p_concepto: concepto,
      p_pin: pinActual,
    })
    if (res && res.success === false) {
      toast(res.error || 'Error al editar pago', 'error')
      return
    }
    toast('Pago actualizado', 'success')
    cerrarModal()
    await render()
  } catch (e) {
    toast('Error: ' + e.message, 'error')
  }
}

async function eliminarPago(id) {
  if (!confirm('¿Eliminar este pago?')) return

  try {
    const res = await rpc('eliminar_pago', {
      p_id: id,
      p_pin: pinActual,
    })
    if (res && res.success === false) {
      toast(res.error || 'Error al eliminar pago', 'error')
      return
    }
    toast('Pago eliminado', 'success')
    await render()
  } catch (e) {
    toast('Error: ' + e.message, 'error')
  }
}

function cerrarModal() {
  document.getElementById('modal-overlay').style.display = 'none'
  pagoEditando = null
}

/* ===================================================
   INICIALIZAR / EDITAR DEUDA
   =================================================== */
async function guardarDeuda(e) {
  e.preventDefault()
  const total = parseInt(document.getElementById('init-total').value, 10)
  const nombre = document.getElementById('init-nombre').value.trim() || 'Mi deuda'
  const nuevoPin = document.getElementById('init-pin-nuevo').value.trim()

  if (!total || total <= 0) {
    toast('Ingresa un monto total válido', 'error')
    return
  }

  try {
    const res = await rpc('iniciar_deuda', {
      p_total: total,
      p_nombre: nombre,
      p_nuevo_pin: nuevoPin || null,
      p_pin: pinActual,
    })
    if (res && res.success === false) {
      toast(res.error || 'Error al guardar deuda', 'error')
      return
    }
    if (nuevoPin) pinActual = nuevoPin
    toast('Deuda guardada correctamente', 'success')
    document.getElementById('init-section').removeAttribute('open')
    await render()
  } catch (e) {
    toast('Error: ' + e.message, 'error')
  }
}

/* ===================================================
   EXPORTAR CSV
   =================================================== */
async function exportarCSV() {
  let pagos
  try {
    pagos = await fetchPagos()
  } catch (e) {
    toast('Error al obtener datos', 'error')
    return
  }

  if (!pagos || pagos.length === 0) {
    toast('No hay pagos para exportar', 'error')
    return
  }

  const header = 'Fecha,Monto,Concepto'
  const rows = pagos.map(p =>
    `"${p.fecha}","${p.monto}","${(p.concepto || '').replace(/"/g, '""')}"`
  ).join('\n')

  const bom = '\uFEFF'
  const blob = new Blob([bom + header + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'historial-pagos.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast('CSV descargado', 'success')
}

/* ===================================================
   COPIAR ENLACE
   =================================================== */
function copiarEnlace() {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    toast('Enlace copiado al portapapeles', 'success')
  }).catch(() => {
    toast('No se pudo copiar el enlace', 'error')
  })
}

/* ===================================================
   EVENTOS
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {
  render()
})

document.getElementById('btn-admin').addEventListener('click', () => {
  document.getElementById('admin-panel').style.display = 'block'
  document.getElementById('pin-input').focus()
})

document.getElementById('btn-cerrar-admin').addEventListener('click', cerrarAdmin)

document.getElementById('btn-verificar-pin').addEventListener('click', verificarPin)
document.getElementById('pin-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verificarPin()
})

document.getElementById('form-pago').addEventListener('submit', agregarPago)

document.getElementById('form-init').addEventListener('submit', guardarDeuda)

document.getElementById('form-editar').addEventListener('submit', guardarEdicion)

document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal)
document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal)
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) cerrarModal()
})

document.getElementById('btn-exportar').addEventListener('click', exportarCSV)
document.getElementById('btn-copiar-enlace').addEventListener('click', copiarEnlace)

document.getElementById('history-body').addEventListener('click', (e) => {
  const btn = e.target.closest('button')
  if (!btn) return
  const id = parseInt(btn.dataset.id, 10)
  if (btn.classList.contains('btn-edit')) {
    abrirEdicion(id)
  } else if (btn.classList.contains('btn-delete')) {
    eliminarPago(id)
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal-overlay')
    if (modal.style.display === 'flex') cerrarModal()
    const admin = document.getElementById('admin-panel')
    if (admin.style.display === 'block' && !pinValido) cerrarAdmin()
  }
})
