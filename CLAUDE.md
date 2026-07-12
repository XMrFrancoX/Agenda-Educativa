## Memoria persistente (Cerebrus)
Path: C:\Users\franc\Documents\cerebrus

Este proyecto reporta a un wiki central que trackea actividad entre todos los proyectos de Franco.

- Al ARRANCAR una sesion de trabajo importante, si el usuario pregunta "que hice la semana pasada" o similar, leer primero `cerebrus/wiki/hot.md`, despues `cerebrus/wiki/projects/Agenda Educativa.md`.
- Al TERMINAR una sesion de trabajo (o cuando el usuario diga "guarda esto" / "actualiza el wiki"), agregar una entrada arriba de `cerebrus/wiki/log.md` con fecha, que se hizo y por que, actualizar `cerebrus/wiki/projects/Agenda Educativa.md`, y reescribir `cerebrus/wiki/hot.md` con el contexto mas reciente.
- No hacerlo automaticamente en cada mensaje - solo al cierre de sesiones con trabajo real, o cuando lo pidan explicitamente.
