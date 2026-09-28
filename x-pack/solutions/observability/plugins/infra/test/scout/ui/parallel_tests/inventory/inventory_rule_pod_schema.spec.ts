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

test.describe(
  'Infrastructure Inventory - Rule flyout pod schema selector',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // The override is server-wide. Inventory tests share one Kibana, so this flag
    // can leak into a parallel worker until afterAll turns it back off.
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'observability.infra.podSchemaSelectorEnabled': true,
        },
      });
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

    test.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'observability.infra.podSchemaSelectorEnabled': false,
        },
      });
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

    test('opening the rule flyout from an ECS pod waffle tile prefills Elastic System Integration', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.selectSchema('Elastic System Integration');

      await inventoryPage.openInventoryRuleFlyoutFromPodWaffleNode(POD_NAMES[0]);

      await expect(inventoryPage.ruleFlyoutForExpressionButton).toContainText('Kubernetes Pods');
      await expect(inventoryPage.ruleFlyoutSchemaExpressionButton).toContainText(
        'Elastic System Integration'
      );
    });
  }
);
