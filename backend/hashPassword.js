
const bcrypt = require('bcryptjs');

const plainTextPassword = 'admin123'; // The password you want to set
const saltRounds = 12; // Match the salt rounds used in your auth.js

bcrypt.hash(plainTextPassword, saltRounds)
  .then(hash => {
    console.log('BCRYPT HASH FOR "admin123":');
    console.log(hash);
    console.log('\nUse this hash in the SQL UPDATE statement below.');
  })
  .catch(err => {
    console.error('Error generating hash:', err);
  });
