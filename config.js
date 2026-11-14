/* Configuración de la cuenta (Firebase, proyecto cpp-estudio). Sin estos datos la app funciona igual, solo en este dispositivo.
   No son secretos: van dentro de cualquier app web. Lo que protege los datos son las reglas de Firestore
   (cada usuario solo puede leer y escribir su propio avance) y que el registro de cuentas nuevas está desactivado. */
window.CPP_FIREBASE = {
  apiKey: 'AIzaSyDjvVvBkGYS74K_5lwcsc0QpKH1NGzVBq0',
  projectId: 'cpp-estudio',
};
