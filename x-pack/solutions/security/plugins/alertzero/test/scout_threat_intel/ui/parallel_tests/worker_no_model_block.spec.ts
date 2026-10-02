/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  ALERTZERO_ENABLED_SETTING_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/alertzero-common';
import { spaceTest, testData } from '../fixtures';

const {
  FEATURE_SETTINGS_APP_URL,
  FLOOR_WORKER_IDS,
  LLM_CONNECTOR_TYPE_IDS,
  MODELS_ROW_MESSAGE,
  NO_MODEL_MESSAGE,
  UNREACHABLE_LLM_CONNECTOR,
} = testData;

const FEATURE_SETTINGS_HREF = new RegExp(`${FEATURE_SETTINGS_APP_URL}$`);

spaceTest.describe('Worker no-model block', { tag: [...tags.stateful.classic] }, () => {
  let connectorId: string | undefined;

  spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
    // The blocked state needs the per-test Scout space to start with no model at all, so fail
    // loudly if the server config ever gains a chat connector or an EIS endpoint.
    const connectors: Array<{ connector_type_id: string }> =
      await apiServices.alerting.connectors.getAll(scoutSpace.id);
    expect(
      connectors.filter(({ connector_type_id: type }) => LLM_CONNECTOR_TYPE_IDS.includes(type)),
      'this suite needs a stack with no LLM connector'
    ).toStrictEqual([]);
    const { endpoints } = await esClient.inference.get({ inference_id: '_all' });
    expect(
      endpoints.filter(({ task_type: taskType }) => taskType === 'chat_completion'),
      'this suite needs a stack with no chat inference endpoint (no EIS)'
    ).toStrictEqual([]);

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

  spaceTest('blocks every Worker while the space has no model', async ({ page, pageObjects }) => {
    const { watchSettings } = pageObjects;
    await watchSettings.goto(SYSTEM_SECURITY_WATCH_FLOOR_ID, FLOOR_WORKER_IDS[0]);

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
        await watchSettings.hideWarnings();
      });
    }

    await spaceTest.step('the Models link opens Feature settings', async () => {
      await watchSettings.modelsLink(FLOOR_WORKER_IDS[0]).click();
      await expect(page).toHaveURL(new RegExp(FEATURE_SETTINGS_APP_URL));
    });
  });

  spaceTest(
    'unblocks every Worker once the space has a model, without turning it on',
    async ({ apiServices, pageObjects, scoutSpace }) => {
      const { watchSettings } = pageObjects;
      const connector = await apiServices.alerting.connectors.create(
        UNREACHABLE_LLM_CONNECTOR,
        scoutSpace.id
      );
      connectorId = connector.id;

      await watchSettings.goto(SYSTEM_SECURITY_WATCH_FLOOR_ID, FLOOR_WORKER_IDS[0]);

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
