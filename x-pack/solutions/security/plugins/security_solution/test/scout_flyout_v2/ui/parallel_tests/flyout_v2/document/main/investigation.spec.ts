/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  spaceTest,
  tags,
  CUSTOM_QUERY_RULE,
  PREVALENCE_SOURCE_IP,
  PREVALENCE_DESTINATION_IP,
  PREVALENCE_HOST_NAME,
  PREVALENCE_USER_NAME,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Document flyout v2 — Investigation section',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      // Index a source event carrying every supported linked investigation field.
      const { sourceIndex } = await apiServices.prevalence.createPrevalenceFixture(scoutSpace.id);

      ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
      await apiServices.detectionRule.createCustomQueryRule({
        ...CUSTOM_QUERY_RULE,
        name: ruleName,
        index: [sourceIndex],
        investigation_fields: {
          field_names: [
            'source.ip',
            'destination.ip',
            'host.name',
            'user.name',
            'kibana.alert.rule.name',
          ],
        },
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
      await apiServices.prevalence.cleanupPrevalenceFixture(scoutSpace.id);
    });

    spaceTest(
      'highlighted fields: clicking the source.ip value opens the network details child flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        await expect(pageObjects.documentFlyout.investigationSection).toBeVisible();
        await expect(pageObjects.documentFlyout.highlightedFieldsTable).toBeVisible();

        const sourceIpLink = pageObjects.documentFlyout.highlightedFieldChildLink('source.ip');
        await expect(sourceIpLink).toBeVisible();
        await expect(sourceIpLink).toContainText(PREVALENCE_SOURCE_IP);

        await sourceIpLink.click();

        await pageObjects.networkFlyout.waitForNetworkFlyout();
        await expect(pageObjects.networkFlyout.title).toContainText(PREVALENCE_SOURCE_IP);
      }
    );

    spaceTest(
      'highlighted fields: clicking the destination.ip value opens the network details child flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        const destinationIpLink =
          pageObjects.documentFlyout.highlightedFieldChildLink('destination.ip');
        await expect(destinationIpLink).toBeVisible();
        await expect(destinationIpLink).toContainText(PREVALENCE_DESTINATION_IP);

        await destinationIpLink.click();

        await pageObjects.networkFlyout.waitForNetworkFlyout();
        await expect(pageObjects.networkFlyout.title).toContainText(PREVALENCE_DESTINATION_IP);
      }
    );

    spaceTest(
      'highlighted fields: clicking the host.name value opens the host details child flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        const hostNameLink = pageObjects.documentFlyout.highlightedFieldChildLink('host.name');
        await expect(hostNameLink).toBeVisible();
        await expect(hostNameLink).toContainText(PREVALENCE_HOST_NAME);

        await hostNameLink.click();

        await pageObjects.hostFlyout.waitForHostFlyout();
        await expect(pageObjects.hostFlyout.title).toContainText(PREVALENCE_HOST_NAME);
      }
    );

    spaceTest(
      'highlighted fields: clicking the user.name value opens the user details child flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        const userNameLink = pageObjects.documentFlyout.highlightedFieldChildLink('user.name');
        await expect(userNameLink).toBeVisible();
        await expect(userNameLink).toContainText(PREVALENCE_USER_NAME);

        await userNameLink.click();

        await pageObjects.userFlyout.waitForUserFlyout();
        await expect(pageObjects.userFlyout.title).toContainText(PREVALENCE_USER_NAME);
      }
    );

    spaceTest(
      'highlighted fields: clicking the rule name opens the rule details child flyout',
      async ({ pageObjects }) => {
        await pageObjects.documentFlyout.openForRule(ruleName);

        const ruleNameLink =
          pageObjects.documentFlyout.highlightedFieldChildLink('kibana.alert.rule.name');
        await expect(ruleNameLink).toBeVisible();
        await expect(ruleNameLink).toContainText(ruleName);

        await ruleNameLink.click();

        await pageObjects.ruleFlyout.waitForRuleFlyout();
        await expect(pageObjects.ruleFlyout.title).toContainText(ruleName);
      }
    );
  }
);
