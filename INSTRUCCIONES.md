# Generador de Proformas – La Cabaña Forestal (v23 · PWA + Firebase)

## Archivos que debes subir al repositorio

Los 7 archivos van juntos en la **raíz** del repositorio:

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación completa (Firebase ya configurado) |
| `manifest.webmanifest` | Datos de la app instalable: nombre, iconos, colores |
| `sw.js` | Service Worker: hace que funcione sin internet |
| `icon-192.png` · `icon-512.png` · `icon-maskable-512.png` | Iconos de la app instalada |
| `favicon.png` | Icono de la pestaña del navegador |

## Publicar en GitHub Pages

1. Crea el repositorio (ej. `proformas-madera`) y sube los 7 archivos a la raíz.
2. **Settings → Pages → Source**: rama `main`, carpeta `/ (root)` → *Save*.
3. La app queda en `https://tu-usuario.github.io/proformas-madera/`.
4. En Firebase → **Authentication → Configuración → Dominios autorizados**, agrega `tu-usuario.github.io`.

> HTTPS es obligatorio para que funcione como PWA. GitHub Pages ya lo entrega, así que no hay nada más que configurar.

## Instalar la app

Al abrir la URL aparece el botón **⬇ Instalar app** en el encabezado. Si no aparece:

- **Chrome / Edge (PC)**: menú ⋮ → *Instalar Generador de Proformas*.
- **Android**: menú ⋮ → *Instalar aplicación*.
- **iPhone / iPad (Safari)**: botón Compartir → *Agregar a pantalla de inicio*.

Instalada, se abre como programa propio (sin barra de navegador), con su icono en el escritorio o menú de inicio. Al mantener pulsado el icono aparecen accesos directos a **Facturas** e **Historial**.

## Funcionamiento sin internet

- La app, sus librerías y tipografías quedan en caché: abre y funciona igual sin conexión.
- Puedes cargar el Excel, numerar, generar proformas, imprimir y descargar PDFs sin internet.
- Firestore guarda una copia local: el historial y las facturas se consultan offline y se sincronizan al recuperar la conexión.
- Aparece el chip **📴 Sin conexión** en el encabezado cuando estás offline.

## Actualizar la app publicada

1. Sube el `index.html` nuevo al repositorio.
2. Abre `sw.js` y **sube el número de `VERSION`** (ej. `v23.1` → `v23.2`). Esto es lo que fuerza la actualización en los equipos que ya la tienen instalada.
3. La próxima vez que alguien abra la app verá la barra *"Hay una versión nueva disponible"* con el botón **Actualizar ahora**.

---

# Funcionalidades

## Base de datos y correlativo (Firebase)

- El próximo N° de proforma vive en Firestore: la numeración nunca retrocede ni se duplica entre meses o equipos.
- Cada proforma se guarda con proveedor, tipo, mes, rol, predio, guías, montos y su detalle completo.

## Selección de tipos al cargar el Excel

Al subir el archivo aparece **"¿Qué tipos de proforma vas a emitir?"** con cada tipo y sus filas. Los tipos que desmarques se ignoran por completo: no se numeran ni se generan, y sus filas quedan intactas para procesarlas después (caso típico: emitir PRE-CIERRE ahora y CIERRE a fin de mes).

## Validación de duplicados

Antes de numerar se compara cada grupo (**proveedor + tipo + destino + guías**) con lo ya registrado:

- **Guías idénticas** → duplicado: no se numera, no consume correlativo y se lista en rojo con el N° existente. Botón *"Incluir igual"* si el caso lo amerita.
- **Guías parcialmente repetidas** → advertencia naranja: se numera igual, pero queda marcado para revisión.
- Al generar, si una proforma ya está registrada con **otro número**, la app pide confirmación antes de emitir.

## Guías de despacho

La referencia se construye desde las filas propias de cada proforma (columna `NÚMERO`), excluyendo filas CCE y ajustes negativos. La columna `GUIAS ASOC` se recalcula y el Excel se exporta actualizado.

## Control de facturas

Botón **🧾 Facturas**: registra el N° de factura de cada proforma. Al abrir la app, si hay pendientes, aparece la alerta con proveedor y número de cada una. También se leen los N° de factura que vengan en la columna `N° FACTURA` del Excel.

## Historial

Botón **📋 Historial**: todas las proformas emitidas, con filtros por **mes, proveedor, rol y predio**, totales al pie, y botones **👁 Ver** y **🖨** para revisar o imprimir la proforma original tal como se emitió.

## Uso mensual

1. Abrir la app → revisar la alerta de facturas pendientes.
2. Cargar el Excel del mes → seleccionar los tipos a emitir.
3. Revisar duplicados → asignar números → generar proformas.
4. Descargar el Excel procesado y los PDFs.
5. Al llegar las facturas: registrarlas en **🧾 Facturas**.

## Estructura en Firestore

- `config_madera/correlativo` → `{ proximo: 30215 }`
- `proformas_madera/{N°}` → `{ num, proveedor, tipo, mes, fecha, rol, predio, guias, neto, iva, total, lineas[], factura, facturaFecha }`

Reglas publicadas en Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /proformas_madera/{doc} { allow read, write: if true; }
    match /config_madera/{doc} { allow read, write: if true; }
  }
}
```
