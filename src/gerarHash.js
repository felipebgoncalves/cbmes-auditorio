const bcrypt = require('bcryptjs');

const senha = 'mimargui!1Q'; // ESTA será a senha de login

bcrypt.hash(senha, 10).then(hash => {
  console.log('Hash da senha:', hash);
}).catch(console.error);
