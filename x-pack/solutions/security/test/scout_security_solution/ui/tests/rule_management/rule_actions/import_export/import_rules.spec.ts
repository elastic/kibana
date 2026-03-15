/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { resetRulesTableState } from '../../../../common/rule_api_helpers';

test.describe(
  'Import rules',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
    });

    test('imports rules from ndjson via API and verifies in table', async ({
      pageObjects,
      page,
      kbnClient,
    }) => {
      const ruleNdjson = JSON.stringify({
        id: 'imported-rule-id',
        rule_id: 'imported-rule',
        name: 'Imported Rule',
        description: 'An imported test rule',
        type: 'query',
        query: 'host.name: *',
        severity: 'low',
        risk_score: 10,
        interval: '5m',
        from: 'now-6m',
        to: 'now',
        language: 'kuery',
        enabled: false,
        actions: [],
        tags: [],
        threat: [],
        references: [],
        false_positives: [],
        max_signals: 100,
        version: 1,
      });

      await kbnClient.request({
        method: 'POST',
        path: '/api/detection_engine/rules/_import',
        body: ruleNdjson + '\n',
        headers: {
          'Content-Type': 'application/x-ndjson',
          'kbn-xsrf': 'scout',
        },
      });

      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();

      await expect(
        pageObjects.rulesManagementTable.ruleName.filter({ hasText: 'Imported Rule' })
      ).toBeVisible();
    });
  }
);
