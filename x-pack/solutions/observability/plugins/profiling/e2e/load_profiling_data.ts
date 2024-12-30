/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import fs from 'fs';
import { createEsClientForTesting } from '@kbn/test';

const esArchiversPath = path.posix.join(__dirname, 'es_archivers');

export async function loadProfilingData({
  esNode,
  esRequestTimeout,
}: {
  esNode: string;
  esRequestTimeout: number;
}) {
  // eslint-disable-next-line no-console
  console.log('Loading Universal profiling data...');
  const client = createEsClientForTesting({
    esUrl: esNode,
    requestTimeout: esRequestTimeout,
    isCloud: true,
  });

  const profilingData = fs.readFileSync(
    `${esArchiversPath}/profiling_data_anonymized.json`,
    'utf8'
  );

  await client.bulk({ operations: profilingData.split('\n'), refresh: 'wait_for', timeout: '1m' });
  // eslint-disable-next-line no-console
  console.log('[Done] Loading Universal profiling data.');
}
