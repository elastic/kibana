/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { withProcRunner } from '@kbn/dev-proc-runner';

import { FtrProviderContext } from '../../../ftr_provider_context';

export type { FtrProviderContext } from '../../../ftr_provider_context';

export async function ObservabilityCypressTestRunner(
  { getService }: FtrProviderContext,
  command: string
) {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [command],
      cwd: resolve(__dirname),
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
}

export async function ObservabilityTestRunner(context: FtrProviderContext) {
  return ObservabilityCypressTestRunner(context, 'cypress:open');
}

export async function ObservabilityHeadlessTestRunner(context: FtrProviderContext) {
  return ObservabilityCypressTestRunner(context, 'cypress:run');
}
