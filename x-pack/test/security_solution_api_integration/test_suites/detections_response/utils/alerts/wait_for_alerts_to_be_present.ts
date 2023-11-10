/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { getAlertsByIds } from './get_alerts_by_ids';
import { waitFor } from '../wait_for';

/**
 * Waits for the signal hits to be greater than the supplied number
 * before continuing with a default of at least one signal
 * @param supertest Deps
 * @param numberOfAlerts The number of alerts to wait for, default is 1
 */
export const waitForAlertsToBePresent = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  numberOfAlerts = 1,
  alertIds: string[],
  namespace?: string
): Promise<void> => {
  await waitFor(
    async () => {
      const alertsOpen = await getAlertsByIds(supertest, log, alertIds, numberOfAlerts, namespace);
      return alertsOpen.hits.hits.length >= numberOfAlerts;
    },
    'waitForAlertsToBePresent',
    log
  );
};
