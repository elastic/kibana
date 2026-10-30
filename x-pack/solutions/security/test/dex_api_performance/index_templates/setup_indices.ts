/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import { type Client } from '@elastic/elasticsearch';
import { type Logger } from '../lib/logger';

const TEMPLATE_FILES = [
  { name: 'perf-dex-runs', file: 'perf_runs.json' },
  { name: 'perf-dex-iterations', file: 'perf_iterations.json' },
  { name: 'perf-dex-memory', file: 'perf_memory_samples.json' },
];

export async function setupIndices(client: Client, logger: Logger): Promise<void> {
  for (const { name, file } of TEMPLATE_FILES) {
    const templatePath = path.join(__dirname, file);
    const templateBody = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    try {
      await client.indices.putIndexTemplate({ name, ...templateBody });
      logger.info(`Index template "${name}" created/updated`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to create index template "${name}": ${message}`);
      throw err;
    }
  }
}
