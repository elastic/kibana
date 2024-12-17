/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../../../shared/lib/cases';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const svlCommonPage = getPageObject('svlCommonPage');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const testSubjects = getService('testSubjects');
  const owner = OBSERVABILITY_OWNER;

  // Failing: See https://github.com/elastic/kibana/issues/189058
  describe.skip('Observability case settings', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
    });
    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    it('case settings screenshots', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await retry.waitFor('configure-case-button exist', async () => {
        return await testSubjects.exists('configure-case-button');
      });
      await testSubjects.click('configure-case-button');
      await retry.waitFor('add-custom-field exist', async () => {
        return await testSubjects.exists('add-custom-field');
      });
      await testSubjects.click('add-custom-field');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-custom-fields',
        screenshotDirectories,
        1400,
        700
      );
      await testSubjects.setValue('custom-field-label-input', 'my-field');
      await retry.waitFor('common-flyout-save exist', async () => {
        return await testSubjects.exists('common-flyout-save');
      });
      await testSubjects.click('common-flyout-save');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-settings',
        screenshotDirectories
      );
      await retry.waitFor('add-template exist', async () => {
        return await testSubjects.exists('add-template');
      });
      await testSubjects.click('add-template');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-templates',
        screenshotDirectories,
        1400,
        1000
      );
      await retry.waitFor('common-flyout-cancel exist', async () => {
        return await testSubjects.exists('common-flyout-cancel');
      });
      await testSubjects.click('common-flyout-cancel');
      await retry.waitFor('dropdown-connectors exist', async () => {
        return await testSubjects.exists('dropdown-connectors');
      });
      await testSubjects.click('add-new-connector');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-add-connector',
        screenshotDirectories
      );
      await retry.waitFor('euiFlyoutCloseButton exist', async () => {
        return await testSubjects.exists('euiFlyoutCloseButton');
      });
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
