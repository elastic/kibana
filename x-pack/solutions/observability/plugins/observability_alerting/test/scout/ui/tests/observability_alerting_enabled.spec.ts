/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import { OBSERVABILITY_ALERTING_SURFACES } from '../fixtures/page_objects';

/*
 * Lives under the default Scout config (`test/scout/`) so
 * `alerting:v2:enabled` stays unpinned and can be flipped at runtime. The
 * dedicated `scout_alerting_v2` config pins the setting on and cannot cover
 * the flag-off case.
 */
test.describe(
  'Observability Alerting URLs with alerting v2 enabled',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    for (const surface of OBSERVABILITY_ALERTING_SURFACES) {
      test(`loads ${surface.name}`, async ({ pageObjects }) => {
        await pageObjects.observabilityAlerting.goto(surface.path);
        await expect(pageObjects.observabilityAlerting.pageTitle).toHaveText(surface.title);
      });
    }
  }
);
