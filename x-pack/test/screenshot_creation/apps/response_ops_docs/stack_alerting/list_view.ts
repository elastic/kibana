/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];
  const pageObjects = getPageObjects(['common', 'header']);
  const actions = getService('actions');
  const rules = getService('rules');
  const testSubjects = getService('testSubjects');
  const ruleName = 'kibana sites - low bytes';

  describe('list view', function () {
    let ruleId: string;
    let connectorId: string;
    before(async () => {
      ({ id: connectorId } = await actions.api.createConnector({
        name: 'my-server-log-connector',
        config: {},
        secrets: {},
        connectorTypeId: '.server-log',
      }));
      ({ id: ruleId } = await rules.api.createRule({
        consumer: 'alerts',
        name: ruleName,
        notifyWhen: 'onActionGroupChange',
        params: {
          index: ['kibana_sample_data_logs'],
          timeField: '@timestamp',
          aggType: 'sum',
          aggField: 'bytes',
          groupBy: 'top',
          termField: 'host.keyword',
          termSize: 4,
          timeWindowSize: 24,
          timeWindowUnit: 'h',
          thresholdComparator: '>',
          threshold: [4200],
        },
        ruleTypeId: '.index-threshold',
        schedule: { interval: '1m' },
        actions: [
          {
            group: 'threshold met',
            id: connectorId,
            params: {
              level: 'info',
              message: 'Test',
            },
          },
        ],
      }));
    });

    after(async () => {
      await rules.api.deleteRule(ruleId);
      await actions.api.deleteConnector(connectorId);
    });

    it('rules list screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot('rules-ui', screenshotDirectories, 1400, 1024);
    });

    it('rule status screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      const actionsDropdown = await testSubjects.find('statusDropdown');
      await actionsDropdown.click();
      await testSubjects.find('ruleStatusMenu');
      await commonScreenshots.takeScreenshot(
        'individual-enable-disable',
        screenshotDirectories,
        1400,
        1024
      );
    });

    it('rule snooze screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      const snoozeBadge = await testSubjects.find('rulesListNotifyBadge-unsnoozed');
      await snoozeBadge.click();
      await commonScreenshots.takeScreenshot('snooze-panel', screenshotDirectories, 1400, 1024);
    });

    it('rule detail screenshots', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.setValue('ruleSearchField', ruleName);
      const rulesList = await testSubjects.find('rulesList');
      const alertRule = await rulesList.findByCssSelector(`[title="${ruleName}"]`);
      await alertRule.click();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'rule-details-alerts-active',
        screenshotDirectories,
        1400,
        1024
      );
      const actionsButton = await testSubjects.find('ruleActionsButton');
      await actionsButton.click();
      await commonScreenshots.takeScreenshot(
        'rule-details-disabling',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
