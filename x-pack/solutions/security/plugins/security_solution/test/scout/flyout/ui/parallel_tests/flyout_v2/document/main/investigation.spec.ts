/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags, CUSTOM_QUERY_RULE, PREVALENCE_HOST_NAME } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Investigation section',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      // Index a source event carrying a linked entity field.
      const { sourceIndex } = await apiServices.prevalence.createPrevalenceFixture(scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
        investigation_fields: { field_names: ['host.name'] },
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await apiServices.prevalence.cleanupPrevalenceFixture(scoutSpace.id);
    });

    spaceTest(
      'highlighted fields: clicking the host.name value opens the host details child flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        await expect(pageObjects.documentFlyout.investigationSection).toBeVisible();
        await expect(pageObjects.documentFlyout.highlightedFieldsTable).toBeVisible();

        const hostNameLink = pageObjects.documentFlyout.highlightedFieldChildLink('host.name');
        await expect(hostNameLink).toBeVisible();
        await expect(hostNameLink).toContainText(PREVALENCE_HOST_NAME);

        await hostNameLink.click();

        await pageObjects.hostFlyout.waitForHostFlyout();
        await expect(pageObjects.hostFlyout.title).toContainText(PREVALENCE_HOST_NAME);
      }
    );
  }
);
