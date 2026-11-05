/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { parse } from 'yaml';
import { WORKFLOW_CONCURRENCY_MAX } from './floor_worker';

const DEFINITIONS = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero'
);

describe('floor and runner workflow concurrency', () => {
  // The active-execution page size is derived from WORKFLOW_CONCURRENCY_MAX, a copy of these yaml values.
  it.each(['floor_attack_discovery.yaml', 'attack_discovery_runner.yaml'])(
    '%s keeps the concurrency the worker setup assumes',
    (file) => {
      const { settings } = parse(Fs.readFileSync(Path.join(DEFINITIONS, file), 'utf-8')) as {
        settings?: { concurrency?: { max?: number; strategy?: string } };
      };
      expect(settings?.concurrency?.max).toBe(WORKFLOW_CONCURRENCY_MAX);
      expect(settings?.concurrency?.strategy).toBe('cancel-in-progress');
    }
  );
});
