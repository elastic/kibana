/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Effect, Layer } from 'effect';

import { ConfigLive } from './config_live';
import { LoggerLive } from './logger_live';
import { DatabaseLive } from './db_live';
import { Database } from './db';

const AppConfigLive = Layer.merge(ConfigLive, LoggerLive);
const MainLive = DatabaseLive.pipe(
  // provides the config and logger to the database
  Layer.provide(AppConfigLive),
  // provides the config to AppConfigLive
  Layer.provide(ConfigLive)
);
const program = Effect.gen(function* () {
  const database = yield* Database;
  const result = yield* database.query('SELECT * FROM users');
  return yield* Effect.succeed(result);
});
const runnable = Effect.provide(program, MainLive);
// eslint-disable-next-line no-console
Effect.runPromise(runnable).then(console.log);
/*
Output:
[INFO] Executing query: SELECT * FROM users
{
  result: 'Results from mysql://username:password@hostname:port/database_name'
}
*/
