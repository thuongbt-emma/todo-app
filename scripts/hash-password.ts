import { hashPassword } from '../src/lib/auth/password';

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: npm run hash-password -- "<password>"');
  process.exit(1);
}
console.log(hashPassword(pw));
