/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { last } from 'lodash';
import { Effect } from 'effect';

const DEFAULT_VERSION = '8.15.0-SNAPSHOT';

export async function getLatestVersion(): Promise<string> {
  const get = () => axios('https://artifacts-api.elastic.co/v1/versions').then(validate);

  return await Effect.runPromise(
    Effect.tryPromise(get).pipe(
      Effect.retry({ times: 50 }),
      Effect.timeout('1 minutes'),
      Effect.catchAll(() => Effect.succeed(DEFAULT_VERSION))
    )
  );
}

function validate(response) {
  return last((response.data.versions as string[]).filter(includesSnapShot)) || DEFAULT_VERSION;
}
function includesSnapShot(v) {
  return v.includes('-SNAPSHOT');
}
