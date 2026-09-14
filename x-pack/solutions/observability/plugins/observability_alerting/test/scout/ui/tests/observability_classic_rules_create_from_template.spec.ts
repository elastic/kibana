/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  makeV1EsQueryRuleTemplateAttributes,
  RULE_TEMPLATE_SO_TYPE,
} from '@kbn/triggers-actions-ui-plugin/test/scout/common/ui/fixtures/helpers';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import {
  MANAGEMENT_ALERTING_V2_URL_RE,
  MANAGEMENT_CLASSIC_RULES_URL_RE,
  OBS_V1_CREATE_URL_RE,
  OBS_V1_NESTED_RULES_URL_RE,
  STANDALONE_RULES_APP_URL_RE,
} from '../fixtures/page_objects';

const templateId = `scout-v1-template-obs-${Date.now()}`;
const templateName = `Scout v1 template ${templateId}`;

test.describe(
  'Observability classic (v1) create rule from template',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      await kbnClient.savedObjects.create({
        type: RULE_TEMPLATE_SO_TYPE,
        id: templateId,
        overwrite: true,
        attributes: makeV1EsQueryRuleTemplateAttributes(templateName),
      });
    });

    test.afterAll(async ({ kbnClient }) => {
      try {
        await kbnClient.savedObjects.delete({
          type: RULE_TEMPLATE_SO_TYPE,
          id: templateId,
        });
      } catch {
        // beforeAll may have failed before the template was created
      }
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('stays on Observability Alerting when selecting a template', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.observabilityClassicRules;

      await browserAuth.loginAsAdmin();
      await rules.goto();
      await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
      await rules.openCreateRuleTypeModal();
      await rules.selectTemplate(templateId, templateName);

      await expect(page).toHaveURL(OBS_V1_CREATE_URL_RE);
      await expect(page).not.toHaveURL(OBS_V1_NESTED_RULES_URL_RE);
      await expect(page).not.toHaveURL(MANAGEMENT_CLASSIC_RULES_URL_RE);
      await expect(page).not.toHaveURL(STANDALONE_RULES_APP_URL_RE);
      await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_URL_RE);
      expect(page.url()).toContain(`/create/template/${templateId}`);
    });
  }
);
