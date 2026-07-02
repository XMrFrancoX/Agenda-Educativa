# Implementation Plan: Correcciones y Arquitectura SaaS

Este plan detalla las correcciones a implementar para resolver los bugs reportados y confirma la estructura arquitectónica del sistema.

## Respuesta sobre Arquitectura Multitenant SaaS
**SÍ, estamos construyendo el sistema bajo una Arquitectura Multitenant (SaaS).** 
La base de datos utiliza el campo `school_id` como identificador de *tenant* (inquilino/escuela). Cada colegio opera en su propio entorno lógico aislado mediante **Row Level Security (RLS)** de Supabase. Esto significa que un usuario de la "Escuela A" nunca podrá ver datos de la "Escuela B" a nivel de base de datos.
El rol de `superadmin` actúa como administrador global de la plataforma (el dueño del SaaS), pudiendo gestionar múltiples tenants (escuelas), dominios personalizados y habilitar/deshabilitar funcionalidades premium (como notificaciones de WhatsApp) por cada tenant.

---

## Proposed Changes

### 1. Configuración y Notificaciones (Email)
- **Problema**: El toggle se guarda como string en lugar de booleano o no se refleja correctamente en la UI, y los emails no se envían.
- **Solución**:
  - Revisar el esquema de la tabla `user_preferences` para asegurar que las columnas sean booleanas y con valor por defecto.
  - Asegurar que la reactividad de Svelte 5 en `/configuracion` cargue los datos booleanos correctamente.
  - Implementar la funcionalidad real de envío de correos usando `nodemailer` en el backend (requiere que el usuario proporcione credenciales SMTP luego, o configurarlas en `.env`).

### 2. Gestión de Usuarios (Admin)
- **Problema**: El dropdown de roles parece bloqueado.
- **Solución**: 
  - El dropdown se bloquea intencionalmente para el propio usuario (un admin no puede cambiarse el rol a sí mismo para evitar quedarse sin acceso). Agregaremos un mensaje o tooltip que aclare esto.
  - Cambiaremos el uso de `value={user.role}` a `bind:value` si es necesario para evitar fallos de reactividad en Svelte 5 al seleccionar otra opción.

### 3. Planificador Staff
- **Problema**: No aparecen docentes o admins para agregarlos a grupos.
- **Solución**:
  - En la consulta de `staff/+page.server.ts`, el filtro actual busca `role in ('teacher', 'director', 'admin')`. Como eres `superadmin`, no apareces en la lista. Modificaremos la consulta para incluir a los `superadmin` asignados a esa escuela.

### 4. Reuniones Funcional
- **Problema**: Hacer que Reuniones sea 100% funcional.
- **Solución**:
  - Revisar y asegurar que las políticas RLS de `meetings` y `meeting_participants` permitan CRUD.
  - Validar que las llamadas a base de datos para crear, editar actas y cambiar estado funcionen correctamente.

### 5. Calendario (Edición de Eventos)
- **Problema**: Al hacer clic en un evento y poner "Editar", se abre la ventana como "Nuevo Evento".
- **Solución**:
  - FullCalendar abstrae el `id` del evento. En `calendario/+page.svelte`, al hacer click, extraeremos el `id` explícitamente y lo pasaremos al modal para que el flag `isEditing` sea evaluado como verdadero, cargando los datos correctamente en modo edición.

## User Review Required
> [!IMPORTANT]
> **Email SMTP:** Para que el envío de correos funcione de verdad, necesitarás un servidor SMTP (como Resend, SendGrid, o un Gmail con contraseña de aplicación). ¿Querés que deje el código listo para leer estas variables de entorno (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) en el archivo `.env`?

## Verification Plan
1. Verificar que los toggles de configuración mantienen su estado al recargar la página.
2. Confirmar que en `/staff` ahora puedes seleccionar a tu usuario y agregarlo a grupos.
3. Asegurar que al editar un evento en el calendario, se abre el modal de edición correcto.
4. Validar las políticas RLS y flujos CRUD de reuniones.
