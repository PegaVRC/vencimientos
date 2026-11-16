'use strict';

(function () {
  const CLAVE = 'vencimientos.v1';
  const DIAS_AVISO = 15;
  const ICONOS = { Auto: '🚗', Hogar: '🏠', Salud: '🩺', Mascota: '🐾', Otro: '📌' };
  const REPITE_TXT = { no: '', mensual: 'Mensual', anual: 'Anual' };

  // ---------- Datos ----------
  let items = cargar();

  function cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch (e) {
      return [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch (e) {
      alert('No se pudieron guardar los datos en este dispositivo.');
    }
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- Fechas (siempre en hora local, formato AAAA-MM-DD) ----------
  function parseFecha(s) {
    const [a, m, d] = s.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  function aTexto(fecha) {
    const a = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${a}-${m}-${d}`;
  }

  function hoy() {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), h.getDate());
  }

  function diasHasta(s) {
    return Math.round((parseFecha(s) - hoy()) / 86400000);
  }

  function diasDelMes(anio, mes) {
    return new Date(anio, mes + 1, 0).getDate();
  }

  // Avanza la fecha un mes o un año, respetando el día original
  // (p. ej. el 31 pasa al 30/28 en meses cortos y vuelve al 31 cuando existe).
  function siguienteFecha(item) {
    const f = parseFecha(item.fecha);
    const dia = item.diaBase || f.getDate();
    let anio = f.getFullYear();
    let mes = f.getMonth();
    if (item.repite === 'mensual') {
      mes += 1;
      if (mes > 11) { mes = 0; anio += 1; }
    } else {
      anio += 1;
    }
    return aTexto(new Date(anio, mes, Math.min(dia, diasDelMes(anio, mes))));
  }

  const fmtFecha = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtHoy = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

  function fechaLegible(s) {
    return fmtFecha.format(parseFecha(s)).replace('.', '');
  }

  function estado(item) {
    if (item.pagado) return 'pagado';
    const d = diasHasta(item.fecha);
    if (d < 0) return 'rojo';
    if (d < DIAS_AVISO) return 'amarillo';
    return 'verde';
  }

  function textoEstado(item) {
    if (item.pagado) return 'Pagado';
    const d = diasHasta(item.fecha);
    if (d < -1) return `Vencido hace ${-d} días`;
    if (d === -1) return 'Venció ayer';
    if (d === 0) return 'Vence hoy';
    if (d === 1) return 'Vence mañana';
    return `Vence en ${d} días`;
  }

  // ---------- Vista ----------
  const $ = (id) => document.getElementById(id);
  const lista = $('lista');
  const listaPagados = $('lista-pagados');

  function render() {
    const txtHoy = fmtHoy.format(new Date());
    $('hoy').textContent = txtHoy.charAt(0).toUpperCase() + txtHoy.slice(1);

    const activos = items.filter((i) => !i.pagado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, 'es'));
    const pagados = items.filter((i) => i.pagado)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const cuenta = { rojo: 0, amarillo: 0, verde: 0 };
    activos.forEach((i) => { cuenta[estado(i)]++; });
    $('cnt-rojo').textContent = cuenta.rojo;
    $('cnt-amarillo').textContent = cuenta.amarillo;
    $('cnt-verde').textContent = cuenta.verde;

    lista.replaceChildren(...activos.map(tarjeta));
    listaPagados.replaceChildren(...pagados.map(tarjeta));

    $('vacio').hidden = activos.length > 0;
    $('pagados-box').hidden = pagados.length === 0;
    $('cnt-pagados').textContent = pagados.length;
  }

  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function tarjeta(item) {
    const li = el('li', 'item ' + estado(item));

    const top = el('div', 'item-top');
    top.append(el('div', 'item-icono', ICONOS[item.categoria] || ICONOS.Otro));

    const info = el('div', 'item-info');
    info.append(el('h3', 'item-nombre', item.nombre));
    const meta = [fechaLegible(item.fecha), item.categoria];
    if (item.repite !== 'no') meta.push('🔁 ' + REPITE_TXT[item.repite]);
    info.append(el('p', 'item-meta', meta.join(' · ')));
    info.append(el('span', 'badge', textoEstado(item)));
    top.append(info);
    li.append(top);

    const acciones = el('div', 'item-acciones');
    if (item.pagado) {
      const b = el('button', 'btn btn-sec', 'Marcar pendiente');
      b.type = 'button';
      b.addEventListener('click', () => desmarcarPagado(item.id));
      acciones.append(b);
    } else {
      const b = el('button', 'btn btn-ok', '✓ Pagado');
      b.type = 'button';
      b.addEventListener('click', () => marcarPagado(item.id));
      acciones.append(b);
    }
    const editar = el('button', 'btn btn-sec', '✎ Editar');
    editar.type = 'button';
    editar.addEventListener('click', () => abrirForm(item.id));
    acciones.append(editar);
    li.append(acciones);

    return li;
  }

  // ---------- Acciones ----------
  function buscar(id) {
    return items.find((i) => i.id === id);
  }

  function marcarPagado(id) {
    const item = buscar(id);
    if (!item) return;
    const anterior = { ...item };

    if (item.repite === 'no') {
      item.pagado = true;
      toast(`“${item.nombre}” marcado como pagado`, anterior);
    } else {
      // Repetitivo: pasa a la siguiente fecha (un mes o un año después).
      item.fecha = siguienteFecha(item);
      toast(`Próximo vencimiento: ${fechaLegible(item.fecha)}`, anterior);
    }
    guardar();
    render();
  }

  function desmarcarPagado(id) {
    const item = buscar(id);
    if (!item) return;
    item.pagado = false;
    guardar();
    render();
  }

  // ---------- Toast con "Deshacer" ----------
  let toastTimer = null;
  let deshacerDato = null;

  function toast(msg, anterior) {
    $('toast-msg').textContent = msg;
    deshacerDato = anterior || null;
    $('toast-btn').hidden = !anterior;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(cerrarToast, 6000);
  }

  function cerrarToast() {
    $('toast').hidden = true;
    deshacerDato = null;
  }

  $('toast-btn').addEventListener('click', () => {
    if (deshacerDato) {
      const idx = items.findIndex((i) => i.id === deshacerDato.id);
      if (idx >= 0) items[idx] = deshacerDato;
      else items.push(deshacerDato);
      guardar();
      render();
    }
    cerrarToast();
  });

  // ---------- Formulario ----------
  const dlg = $('dlg');
  const form = $('form');
  let editandoId = null;

  function abrirForm(id) {
    editandoId = id || null;
    const item = id ? buscar(id) : null;
    form.reset();
    $('f-error').hidden = true;
    $('dlg-titulo').textContent = item ? 'Editar vencimiento' : 'Nuevo vencimiento';
    $('btn-eliminar').hidden = !item;
    $('f-nombre').value = item ? item.nombre : '';
    $('f-fecha').value = item ? item.fecha : aTexto(hoy());
    form.elements.categoria.value = item ? item.categoria : 'Auto';
    form.elements.repite.value = item ? item.repite : 'no';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    if (!item) setTimeout(() => $('f-nombre').focus(), 50);
  }

  function cerrarForm() {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
    editandoId = null;
  }

  function mostrarError(msg) {
    $('f-error').textContent = msg;
    $('f-error').hidden = false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = $('f-nombre').value.trim();
    const fecha = $('f-fecha').value;
    const categoria = form.elements.categoria.value || 'Otro';
    const repite = form.elements.repite.value || 'no';

    if (!nombre) { mostrarError('Escribe un nombre.'); $('f-nombre').focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { mostrarError('Elige una fecha.'); $('f-fecha').focus(); return; }

    const diaBase = parseFecha(fecha).getDate();
    if (editandoId) {
      const item = buscar(editandoId);
      if (item) {
        const cambioFecha = item.fecha !== fecha;
        Object.assign(item, { nombre, fecha, categoria, repite, diaBase });
        if (cambioFecha) item.pagado = false;
      }
    } else {
      items.push({ id: nuevoId(), nombre, fecha, categoria, repite, diaBase, pagado: false });
    }
    guardar();
    render();
    cerrarForm();
  });

  $('btn-cancelar').addEventListener('click', cerrarForm);

  $('btn-eliminar').addEventListener('click', () => {
    const item = buscar(editandoId);
    if (!item) return;
    if (!confirm(`¿Eliminar “${item.nombre}”?`)) return;
    const anterior = { ...item };
    items = items.filter((i) => i.id !== item.id);
    guardar();
    render();
    cerrarForm();
    toast(`“${anterior.nombre}” eliminado`, anterior);
  });

  // Cerrar tocando fuera del formulario
  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarForm(); });

  $('btn-agregar').addEventListener('click', () => abrirForm());

  // Refrescar colores al volver a la app (por si cambió el día)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { items = cargar(); render(); }
  });

  render();

  // ---------- Service worker (modo sin conexión e instalación) ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
