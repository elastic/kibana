/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';

test.describe('Rule details - non default space', { tag: [...tags.stateful.classic] }, () => {
  const SPACE_ID = 'custom-space';

  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);

    await kbnClient
      .request({
        method: 'POST',
        path: '/api/spaces/space',
        body: { id: SPACE_ID, name: 'Custom Space', disabledFeatures: [] },
      })
      .catch(() => {});
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient
      .request({ method: 'DELETE', path: `/api/spaces/space/${SPACE_ID}` })
      .catch(() => {});
  });

  test('rule details in custom space', async ({ pageObjects, page, kbnClient }) => {
    const ruleResp = await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ name: 'Space rule', rule_id: 'space-1', enabled: false })
    );

    await pageObjects.ruleDetails.goto(ruleResp.id);
    await pageObjects.ruleDetails.waitForPageToLoad('Space rule');
    await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText('Space rule');
  });
});
