/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Observability case settings and custom fields', function () {
    it('case settings screenshots', async () => {
      // With the templates feature flag pinned ON for this suite, custom fields and
      // templates are managed on the dedicated v2 templates / field-library pages
      // rather than inline on the Case Settings page.
      await cases.navigation.navigateToApp('observability/cases', 'cases-all-title');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('configure-case-button');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('case-configure-title exist', async () => {
        return await testSubjects.exists('case-configure-title');
      });

      // Field library page — reachable when the templates flag is ON. Strip any
      // query string / hash so the sub-path is appended cleanly.
      const configureUrl = (await browser.getCurrentUrl()).split(/[?#]/)[0].replace(/\/$/, '');
      await browser.get(`${configureUrl}/field_library`);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('fieldDefinitionsTable exist', async () => {
        return await testSubjects.exists('fieldDefinitionsTable');
      });
      await commonScreenshots.takeScreenshot(
        'cases-add-custom-field',
        screenshotDirectories,
        1400,
        700
      );

      await browser.get(`${configureUrl}/templates`);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('templates-table exist', async () => {
        return await testSubjects.exists('templates-table');
      });
      await commonScreenshots.takeScreenshot('cases-settings', screenshotDirectories, 1400, 1024);
    });
  });
}
