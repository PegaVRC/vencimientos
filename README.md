# Vencimientos

App para recordar vencimientos del hogar: revisión técnica, permiso de circulación, cuentas y más.

Es una aplicación web instalable (PWA), pensada para el celular:

- Agrega, edita y elimina vencimientos con nombre, fecha, categoría (Auto, Hogar, Salud, Mascota, Otro) y repetición (no, mensual, anual).
- Lista ordenada por urgencia con colores: **rojo** vencido, **amarillo** vence en menos de 15 días, **verde** al día.
- Al marcar como pagado un vencimiento repetitivo, pasa solo a la siguiente fecha (un mes o un año después). Los que no se repiten quedan en la sección "Pagados".
- Los datos se guardan en el propio teléfono (`localStorage`); no hay servidor ni cuentas.
- Funciona sin conexión una vez abierta.

## Publicar en GitHub Pages

1. Sube estos archivos a la rama `main` del repositorio.
2. En GitHub: **Settings → Pages → Build and deployment**, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)` y guarda.
3. En unos minutos estará en `https://<tu-usuario>.github.io/vencimientos/`.

## Instalar en el teléfono

- **Android (Chrome):** abre la dirección y toca **Instalar app** (o menú ⋮ → *Agregar a la pantalla principal*).
- **iPhone (Safari):** abre la dirección, toca **Compartir** → *Agregar a inicio*.

## Actualizar la app

Después de cambiar archivos, sube el número de versión en `sw.js` (`vencimientos-v1` → `vencimientos-v2`) para que los teléfonos descarguen la nueva versión.

## Probar en tu computador

```sh
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

> Nota: como los datos viven en el navegador del teléfono, si borras los datos del navegador o desinstalas la app se pierden.
