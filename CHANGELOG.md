# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

Este formato está inspirado en Keep a Changelog y versionado semántico.

## [0.3.0] - 2026-04-05

### Added

- Tooltips contextuales en nodos con delay de hover (~400ms)
- Contenido de tooltip con datos del nodo y métricas jerárquicas
- Reposicionamiento dinámico del tooltip para mantenerlo dentro del viewport
- Transición suave al cambiar de nodo con tooltip visible

### Fixed

- La tecla `Shift` ya no dispara lógica de selección cuando el nombre del nodo está en edición inline
- El tooltip se oculta correctamente en estados incompatibles (drag, modal abierto y edición inline)

### Changed

- README actualizado con documentación de tooltips y comportamiento asociado

## [0.2.0] - 2026-04-05

### Added

- Selección múltiple de nodos con `Shift + click`
- Copiado de nodos al portapapeles interno con `Ctrl + C`
- Pegado con modal de destino (`raíz` o `bajo nodo`) con `Ctrl + V`
- Renombrado automático al pegar (`(copia)`, `(copia 2)`, ...)
- Eliminación de selección múltiple con reglas de confirmación/reconexión
- Feedback visual para selección múltiple, previsualización con Shift y drag grupal

### Changed

- Movimiento de nodos en grupo manteniendo distancias relativas
- Operaciones de mover/pegar/eliminar selección integradas como acciones atómicas para undo/redo
- README actualizado con atajos y comportamiento de selección

## [0.1.0] - 2026-04-05

### Added

- Estructura inicial funcional de Organigramix
- Interfaz para gestión de personas, roles y jerarquías
- Soporte de minimapa, zoom y auto-ordenado
- Exportación a PNG, JSON y HTML standalone
- Tema claro/oscuro con persistencia local
- Preparación y despliegue en GitHub Pages
- Base de documentación open source (README, CONTRIBUTING, SECURITY, etc.)
