/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import { globalTeardownHook } from '@kbn/scout';
import { cleanupOsqueryInstalledNoAgents } from '../src/data_generators/osquery_trap';
import {
  configureOsqueryTrapStatePath,
  readOsqueryTrapState,
} from '../src/data_generators/osquery_trap_state';

globalTeardownHook('Clean up installed-with-no-agents Osquery trap', async ({ kbnClient, log }) => {
  const statePath = configureOsqueryTrapStatePath();
  const resources = await readOsqueryTrapState(statePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (!resources) return;

  await cleanupOsqueryInstalledNoAgents(kbnClient, resources, log);
  await Fs.unlink(statePath);
});
