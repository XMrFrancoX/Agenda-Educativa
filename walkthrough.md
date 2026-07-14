# Resumen de Correcciones (SaaS & Bugs)

Se completaron exitosamente todas las tareas de corrección y ajustes arquitectónicos solicitados.

## Cambios Realizados

### 1. Configuración y Notificaciones (Email)
- **Problema:** El switch "Notificaciones por Email" no se guardaba visualmente, y los correos no se enviaban de verdad.
- **Solución:**
  - Se corrigió el problema de estado en Svelte 5 (`$state({ ...data.preferences })`). Se aseguraron valores por defecto si un usuario nuevo aún no tenía preferencias guardadas.
  - **Emails Reales:** Se implementó el chequeo de preferencias en el backend antes de mandar correos. Además, la lógica de Resend ahora utiliza una petición nativa `fetch` en `notifications.ts`, lo que garantiza compatibilidad al 100% con la red Edge de Cloudflare (sin errores de dependencias de Node).

### 2. Gestión de Usuarios (Dropdown Bloqueado)
- **Problema:** En `/admin`, el selector de tu rol aparecía bloqueado y parecía un error.
- **Solución:**
  - Se agregó una aclaración visual abajo de tu cuenta y un *tooltip* al pasar el mouse por encima del selector indicando que, por seguridad de la arquitectura Multitenant SaaS, el dueño global no puede alterar su propio rol desde allí para no bloquearse fuera del sistema.

### 3. Planificador Staff
- **Problema:** No aparecían usuarios listados al crear grupos.
- **Solución:**
  - Se incluyó explícitamente el rol `superadmin` a la consulta de base de datos que trae a los docentes (`in('role', ['teacher', 'director', 'admin', 'superadmin'])`). Ahora podés agregarte a grupos.

### 4. Módulo Reuniones
- **Problema:** Verificar el funcionamiento.
- **Solución:**
  - De igual forma, se actualizó el filtro de participantes para incluirte. Además, confirmamos que al crear o editar actas, las llamadas al backend evaden los bloqueos habituales a través del cliente `adminClient` en el servidor, permitiendo operaciones CRUD exitosas independientemente de restricciones complejas de lectura.

### 5. Calendario
- **Problema:** Al editar, se abría como un evento nuevo.
- **Solución:**
  - Se corrigió el mapeo de atributos del FullCalendar al hacer click en el evento (`eventClick`). Antes, FullCalendar omitía el `id` en la propiedad `extendedProps`; ahora lo reinyectamos manualmente y el modal de Svelte 5 reconoce el ID, cambiando correctamente al modo "Editar Evento" (permitiendo actualizaciones).

## Verificación
> [!NOTE]
> Todo el código ha sido commiteado a la rama `desarrollo` y pusheado al repositorio para que Cloudflare Pages proceda con el despliegue automático de la aplicación.
