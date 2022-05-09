/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { getSignalsByIds } from './get_signals_by_ids';
import { waitFor } from './wait_for';

/**
 * Waits for the signal hits to be greater than the supplied number
 * before continuing with a default of at least one signal
 * @param supertest Deps
 * @param numberOfSignals The number of signals to wait for, default is 1
 */
export const waitForSignalsToBePresent = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  numberOfSignals = 1,
  signalIds: string[]
): Promise<void> => {
  await waitFor(
    async () => {
      const signalsOpen = await getSignalsByIds(supertest, log, signalIds, numberOfSignals);
      return signalsOpen.hits.hits.length >= numberOfSignals;
    },
    'waitForSignalsToBePresent',
    log
  );
};
