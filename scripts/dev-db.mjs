// Local Postgres via real binaries from npm. Data lives outside OneDrive.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const databaseDir = path.join(os.homedir(), '.personal-todo-pgdata');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port: 5434,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
for (const name of ['personal_todo', 'personal_todo_test']) {
  try {
    await pg.createDatabase(name);
  } catch {
    // already exists
  }
}
console.log('Postgres ready on localhost:5434 (dbs: personal_todo, personal_todo_test)');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
