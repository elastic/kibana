/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { navigateToCasesApp } from '@kbn/test-suites-xpack-platform/serverless/shared/lib/cases';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage', 'svlCommonNavigation']);
  const retry = getService('retry');
  const browser = getService('browser');
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'security_cases'];
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const owner = SECURITY_SOLUTION_OWNER;

  describe('security case settings', function () {
    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    beforeEach(async () => {
      await pageObjects.svlCommonPage.loginWithRole('admin');
    });

    it('case settings screenshot', async function () {
      // With the templates feature flag pinned ON for this suite, custom fields and
      // templates are managed on the dedicated v2 templates / field-library pages
      // rather than inline on the Case Settings page. Capture the settings page,
      // the templates list, and the field library for the docs.
      await navigateToCasesApp(getPageObject, getService, owner);
      // The redesigned settings page drops the custom fields and templates management these
      // screenshots document, so skip while the redesign is on.
      if (await cases.common.isRedesignEnabled()) {
        return this.skip();
      }
      await retry.waitFor('configure-case-button exist', async () => {
        return await testSubjects.exists('configure-case-button');
      });
      await testSubjects.click('configure-case-button');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('case-configure-title exist', async () => {
        return await testSubjects.exists('case-configure-title');
      });
      await svlCommonScreenshots.takeScreenshot('security-cases-settings', screenshotDirectories);

      // Templates list page — reachable when the templates flag is ON.
      // Strip any query string / hash so the sub-path is appended cleanly.
      const configureUrl = (await browser.getCurrentUrl()).split(/[?#]/)[0].replace(/\/$/, '');
      await browser.get(`${configureUrl}/templates`);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('templates-table exist', async () => {
        return await testSubjects.exists('templates-table');
      });
      await svlCommonScreenshots.takeScreenshot(
        'security-cases-templates',
        screenshotDirectories,
        1400,
        1000
      );

      // Field library page — reachable when the templates flag is ON.
      await browser.get(`${configureUrl}/field_library`);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('fieldDefinitionsTable exist', async () => {
        return await testSubjects.exists('fieldDefinitionsTable');
      });
      await svlCommonScreenshots.takeScreenshot(
        'security-cases-field-library',
        screenshotDirectories,
        1400,
        700
      );
    });
  });
}
