/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { seedOsqueryInstalledNoAgents } from '../src/data_generators/osquery_trap';
import {
  configureOsqueryTrapStatePath,
  writeOsqueryTrapState,
} from '../src/data_generators/osquery_trap_state';

globalSetupHook('Seed installed Osquery with no agents', async ({ kbnClient, log }) => {
  const statePath = configureOsqueryTrapStatePath();
  await seedOsqueryInstalledNoAgents(kbnClient, log, {
    allowPackageInstall: true,
    persistResources: (resources) => writeOsqueryTrapState(statePath, resources),
  });
});
