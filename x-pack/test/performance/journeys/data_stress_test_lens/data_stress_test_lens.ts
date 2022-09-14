/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';
import { waitForVisualizations } from '../../utils';
import { JOURNEY_DATA_STRESS_TEST_LENS } from './config';

export default function ({ getService }: FtrProviderContext) {
  describe(JOURNEY_DATA_STRESS_TEST_LENS, () => {
    const performance = getService('performance');

    it(JOURNEY_DATA_STRESS_TEST_LENS, async () => {
      await performance.runUserJourney(
        JOURNEY_DATA_STRESS_TEST_LENS,
        [
          {
            name: 'Go to dashboard',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(
                `${kibanaUrl}/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`
              );

              await waitForVisualizations(page, 1);
            },
          },
        ],
        {
          requireAuth: false,
        }
      );
    });
  });
}
