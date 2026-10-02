/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, testData } from '../fixtures';

const {
  ALERTZERO_ENABLED_SETTING_ID,
  FEATURE_SETTINGS_PATH,
  FLOOR_WATCH_ID,
  FLOOR_WORKER_IDS,
  LLM_CONNECTOR,
  MODELS_ROW_MESSAGE,
  NO_MODEL_MESSAGE,
} = testData;

const FEATURE_SETTINGS_HREF = new RegExp(`${FEATURE_SETTINGS_PATH}$`);

// The worker space starts with no connectors, and this config set has no EIS, so the space has no
// model until a test adds one.
spaceTest.describe('Worker no-model block', { tag: [...tags.stateful.classic] }, () => {
  let connectorId: string | undefined;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({ [ALERTZERO_ENABLED_SETTING_ID]: true });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
    if (connectorId) {
      await apiServices.alerting.connectors.delete(connectorId, scoutSpace.id);
      connectorId = undefined;
    }
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(ALERTZERO_ENABLED_SETTING_ID);
  });

  spaceTest('blocks every Worker while the space has no model', async ({ pageObjects }) => {
    const { watchSettings } = pageObjects;
    await watchSettings.goto(FLOOR_WATCH_ID, FLOOR_WORKER_IDS[0]);

    for (const workerId of FLOOR_WORKER_IDS) {
      await spaceTest.step(`${workerId} is blocked and says why`, async () => {
        await expect(watchSettings.enabledSwitch(workerId)).toBeDisabled();
        await expect(watchSettings.modelsRow(workerId)).toContainText(MODELS_ROW_MESSAGE);
        await expect(watchSettings.modelsLink(workerId)).toHaveAttribute(
          'href',
          FEATURE_SETTINGS_HREF
        );

        await watchSettings.showWarnings(workerId);
        await expect(watchSettings.warningTooltip).toHaveText(NO_MODEL_MESSAGE);
        await expect(watchSettings.noModelLink(workerId)).toHaveAttribute(
          'href',
          FEATURE_SETTINGS_HREF
        );
        await watchSettings.hideWarnings();
      });
    }
  });

  spaceTest(
    'unblocks every Worker once the space has a model, keeping its stored value',
    async ({ apiServices, pageObjects, scoutSpace }) => {
      const { watchSettings } = pageObjects;
      const connector = await apiServices.alerting.connectors.create(LLM_CONNECTOR, scoutSpace.id);
      connectorId = connector.id;

      await watchSettings.goto(FLOOR_WATCH_ID, FLOOR_WORKER_IDS[0]);

      for (const workerId of FLOOR_WORKER_IDS) {
        await spaceTest.step(`${workerId} can be turned on again`, async () => {
          await expect(watchSettings.enabledSwitch(workerId)).toBeEnabled();
          await expect(watchSettings.enabledSwitch(workerId)).toHaveAttribute(
            'aria-checked',
            'false'
          );
          await expect(watchSettings.warningIcon(workerId)).toBeHidden();
          await expect(watchSettings.modelsRow(workerId)).toContainText(MODELS_ROW_MESSAGE);
        });
      }
    }
  );
});
