/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  describe('pre-upgrade', function describeIndexTests() {
    const PageObjects = getPageObjects(['common', 'settings', 'header']);
    const retry = getService('retry');
    const log = getService('log');
    const browser = getService('browser');
    const monacoEditor = getService('monacoEditor');
    const testSubjects = getService('testSubjects');
    const find = getService('find');

    const alertName = 'UpgradeRule';

    before(async () => {
      await PageObjects.common.navigateToApp('management', { insertTimestamp: false });
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('triggersActions');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // await browser.setWindowSize(1200, 800);
    });

    // see https://github.com/elastic/elastic-stack-testing/blob/main/ci/upgrade/buildSrc/src/main/java/org/estf/gradle/UploadRulesData.java
    it('create rule default space', async function createRule() {
      // note that the button to find depends on having existing default rules in this default space
      await retry.waitFor(
        'Create Rule button is visible',
        async () => await testSubjects.exists('createAlertButton')
      );
      await testSubjects.click('createAlertButton');
      await retry.waitFor(
        'Create Rule flyout is visible',
        async () => await testSubjects.exists('addAlertFlyoutTitle')
      );

      await testSubjects.setValue('alertNameInput', alertName);
      await testSubjects.click('monitoring_alert_cpu_usage-SelectOption');
      await find.setValue('.euiFieldNumber--inGroup', '75');

      await testSubjects.click('saveAlertButton');

      await testSubjects.click('confirmModalConfirmButton');
    });

    it('create rule automation space', async function createRule() {
      const basePath = 's/automation';
      await PageObjects.common.navigateToUrl(
        'management',
        'insightsAndAlerting/triggersActions/rules',
        {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: true,
          shouldUseHashForSubUrl: false,
          basePath,
        }
      );
      // Note that the button to find in this case depends on no existing rules in this automation space
      await retry.waitFor(
        'Create Rule button is visible',
        async () => await testSubjects.exists('createFirstAlertButton')

      );
      await testSubjects.click('createFirstAlertButton');
      await retry.waitFor(
        'Create Rule flyout is visible',
        async () => await testSubjects.exists('addAlertFlyoutTitle')
      );

      await testSubjects.setValue('alertNameInput', alertName);
      await testSubjects.click('monitoring_alert_cpu_usage-SelectOption');
      await find.setValue('.euiFieldNumber--inGroup', '75');

      await testSubjects.click('saveAlertButton');

      await testSubjects.click('confirmModalConfirmButton');
    });

  });
};
