/* Pantalla de acceso.
   Un único botón. No hay validación ni campos porque no habría nada que
   validar: lo que hace es abrir la sesión anónima de Supabase (que es lo que
   da un auth.uid() real para que funcione RLS) y pasar al onboarding. */

(function () {
  'use strict';

  var boton = Studdy.$('#entrar');
  var error = Studdy.$('#error');

  boton.addEventListener('click', function () {
    error.innerHTML = '';
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Entrando…';

    Studdy.signIn()
      .then(function () {
        window.location.href = 'onboarding.html';
      })
      .catch(function (err) {
        error.innerHTML = Studdy.errorHtml(err.message);
        boton.disabled = false;
        boton.textContent = 'Entrar';
      });
  });
})();
