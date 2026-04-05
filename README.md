# Organigramix

Organigramix es un constructor visual de organigramas hecho con HTML, CSS y JavaScript vanilla.
Permite crear, editar y exportar estructuras jerárquicas de manera rápida, sin dependencias de build.

## Demo

- Producción: https://apmauj.github.io/Organigramix/

## Características

- Edición visual de nodos (drag and drop)
- Selección múltiple con Shift + click
- Copiar y pegar nodos con portapapeles interno
- Movimiento grupal de nodos seleccionados
- Tooltips contextuales con información jerárquica
- Gestión de roles y jerarquías
- Colapsar y expandir ramas
- Buscador de personas y filtros rápidos
- Minimapa interactivo
- Zoom y ajuste a vista
- Auto-ordenado de nodos
- Exportación a PNG, JSON y HTML standalone
- Tema claro/oscuro con persistencia local

## Stack

- HTML5
- CSS3 (variables CSS, diseño responsive)
- JavaScript vanilla (sin framework)
- html2canvas para exportar PNG

## Estructura del proyecto

```text
Organigramix/
  index.html
  Organigramix.html
  styles/
    main.css
  scripts/
    app.js
```

## Ejecutar en local

No requiere instalación de dependencias.

1. Clonar el repositorio.
2. Abrir `index.html` en el navegador.

Opcional (recomendado para desarrollo): usar un servidor estático local.

## Atajos y comportamiento de selección

- `Shift + click`: agrega o quita nodos de la selección múltiple.
- `Escape`: limpia toda la selección actual.
- `Ctrl + C`: copia los nodos seleccionados al portapapeles interno.
- `Ctrl + V`: abre modal de pegado (`raíz` o `bajo nodo`, cuando hay un único nodo seleccionado).
- `Delete`: elimina toda la selección (con confirmación en casos de mayor impacto).

Notas de comportamiento:

- No se permite seleccionar simultáneamente un nodo con sus ancestros o descendientes.
- El copiado es plano: no incluye hijos, solo los nodos seleccionados.
- Al pegar, cada nodo recibe nuevo ID y nombre con sufijo ` (copia)`, ` (copia 2)`, etc.
- Si se pega bajo un nodo colapsado, ese nodo se expande automáticamente.
- Si hay varios nodos seleccionados, arrastrar uno mueve el grupo completo manteniendo sus distancias relativas.

## Tooltips de nodo

- Se muestran al mantener el mouse quieto sobre un nodo por ~400ms.
- Incluyen datos del nodo (nombre, área, rol) y resumen jerárquico (padre, subordinados, descendientes, estado contraído).
- No aparecen durante arrastre, edición inline del nombre, ni sobre botones internos del nodo.
- Se posicionan sobre el nodo con ajuste automático para no salirse de la ventana visible.

## Publicación

El proyecto está preparado para GitHub Pages usando `main` + `/ (root)`.

## Convenciones

- Código simple, legible y sin tooling obligatorio.
- Cambios pequeños, atómicos y con mensajes claros.
- Mantener la interfaz consistente en tema oscuro y claro.

## Documentación del proyecto

- Guía de contribución: [CONTRIBUTING.md](CONTRIBUTING.md)
- Historial de cambios: [CHANGELOG.md](CHANGELOG.md)
- Seguridad: [SECURITY.md](SECURITY.md)
- Código de conducta: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Roadmap sugerido

- Mejorar accesibilidad (teclado, roles ARIA)
- Añadir tests básicos de regresión visual
- Modularizar `app.js` por dominios
- Añadir import/export CSV

## Licencia

Pendiente de definir.
