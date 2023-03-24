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
  const rules = getService('rules');
  const testSubjects = getService('testSubjects');

  describe('list view', function () {
    let ruleId: string;
    const indexThresholdRule = {
      consumer: 'alerts',
      name: 'my rule',
      notifyWhen: 'onActionGroupChange',
      params: {
        index: ['.test-index'],
        timeField: '@timestamp',
        aggType: 'count',
        groupBy: 'all',
        timeWindowSize: 5,
        timeWindowUnit: 'd',
        thresholdComparator: '>',
        threshold: [1000],
      },
      ruleTypeId: '.index-threshold',
      schedule: { interval: '1m' },
      tags: [],
      actions: [],
    };

    before(async () => {
      ({ id: ruleId } = await rules.api.createRule(indexThresholdRule));
    });

    after(async () => {
      await rules.api.deleteRule(ruleId);
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
  });
}
