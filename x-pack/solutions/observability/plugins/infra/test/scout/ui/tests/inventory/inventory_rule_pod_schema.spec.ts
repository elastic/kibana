/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  DATE_WITH_MIXED_POD_DATA,
  EXTENDED_TIMEOUT,
  POD_NAMES,
  SEMCONV_PODS,
} from '../../fixtures/constants';
import {
  cleanInventoryPodsSemconvSynthtraceData,
  ingestInventoryPodsSemconvSynthtraceData,
} from '../../fixtures/sequential_pods_synthtrace';

const RULE_NAME = 'Inventory pod schema selector rule';
const RULE_FILTER = `alert.attributes.name:"${RULE_NAME}"`;

test.describe(
  'Infrastructure Inventory - Rule flyout pod schema selector',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Sequential project (`playwright.config.ts` / `testDir: './tests'`). This suite
    // ingests its own fixtures — sequential specs do not run
    // `parallel_tests/global.setup.ts`.
    test.beforeAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: ingesting Inventory SemConv pod metrics for rule flyout');
      await ingestInventoryPodsSemconvSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsPrivilegedUser();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPage();
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });
    });

    test.afterAll(async ({ apiServices, esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: cleaning inventory rules created by this suite');
      const {
        data: { data: rules },
      } = await apiServices.alerting.rules.find({ filter: RULE_FILTER });
      for (const rule of rules) {
        await apiServices.alerting.rules.delete(rule.id);
      }

      log.info('Sequential suite: cleaning Inventory SemConv pod metrics for rule flyout');
      await cleanInventoryPodsSemconvSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test('creating an inventory rule from the pods view prefills the schema selector', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.openInventoryRuleFlyout();
      await expect(inventoryPage.ruleFlyoutForExpressionButton).toContainText('Kubernetes Pods');
      await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText('OpenTelemetry');

      await inventoryPage.ruleFlyoutSchemaExpressionButton.click();
      await expect(inventoryPage.ruleFlyoutSchemaSelect.locator('option')).toHaveText([
        'Elastic System Integration',
        'OpenTelemetry',
      ]);
    });

    test('rule flyout schema follows the toolbar selection', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.selectSchema('Elastic System Integration');
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);

      await inventoryPage.openInventoryRuleFlyout();
      await expect(inventoryPage.ruleFlyoutForExpressionButton).toContainText('Kubernetes Pods');
      await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText(
        'Elastic System Integration'
      );
    });

    test('opening the rule flyout from a SemConv pod waffle tile prefills OpenTelemetry', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.openInventoryRuleFlyoutFromPodWaffleNode(SEMCONV_PODS[0].name);

      await expect(inventoryPage.ruleFlyoutForExpressionButton).toContainText('Kubernetes Pods');
      await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText('OpenTelemetry');
    });

    test('saves the schema picked in the rule flyout', async ({
      pageObjects: { inventoryPage },
      apiServices,
    }) => {
      await test.step('switch the prefilled schema to Elastic System Integration', async () => {
        await inventoryPage.openInventoryRuleFlyoutFromPodWaffleNode(SEMCONV_PODS[0].name);
        await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText('OpenTelemetry');

        await inventoryPage.selectRuleSchema('ecs');

        await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText(
          'Elastic System Integration'
        );
      });

      await test.step('save the rule', async () => {
        await inventoryPage.setRuleThreshold(50);
        await inventoryPage.saveRule(RULE_NAME);
      });

      await test.step('the saved rule keeps the picked schema', async () => {
        const {
          data: { data: rules },
        } = await apiServices.alerting.rules.find({ filter: RULE_FILTER });

        expect(rules).toHaveLength(1);
        expect(rules[0].params).toMatchObject({ nodeType: 'pod', schema: 'ecs' });
      });
    });

    test('opening the rule flyout from an ECS pod waffle tile prefills Elastic System Integration', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.selectSchema('Elastic System Integration');
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);

      await inventoryPage.openInventoryRuleFlyoutFromPodWaffleNode(POD_NAMES[0]);

      await expect(inventoryPage.ruleFlyoutForExpressionButton).toContainText('Kubernetes Pods');
      await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText(
        'Elastic System Integration'
      );
    });
  }
);
