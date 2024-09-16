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
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const testSubjects = getService('testSubjects');
  const owner = OBSERVABILITY_OWNER;

  // FLAKY:https://github.com/elastic/kibana/issues/189058
  describe.skip('Observability case settings', function () {
    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    it('case settings screenshots', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await testSubjects.click('configure-case-button');
      await testSubjects.click('add-custom-field');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-custom-fields',
        screenshotDirectories,
        1400,
        700
      );
      await testSubjects.setValue('custom-field-label-input', 'my-field');
      await testSubjects.click('common-flyout-save');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-settings',
        screenshotDirectories
      );
      await testSubjects.click('add-template');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-templates',
        screenshotDirectories,
        1400,
        1000
      );
      await testSubjects.click('common-flyout-cancel');
      await testSubjects.click('dropdown-connectors');
      await testSubjects.click('dropdown-connector-add-connector');
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-add-connector',
        screenshotDirectories
      );
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
