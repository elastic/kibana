/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import { navigateToCasesApp } from '@kbn/test-suites-xpack-platform/serverless/shared/lib/cases';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const svlCommonPage = getPageObject('svlCommonPage');
  const header = getPageObject('header');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const owner = OBSERVABILITY_OWNER;

  describe('Observability case settings', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
    });
    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    it('case settings screenshots', async function () {
      // With the templates feature flag pinned ON for this suite, custom fields and
      // templates are managed on the dedicated v2 templates / field-library pages
      // rather than inline on the Case Settings page. Capture the settings page,
      // the templates list, the field library, and the add-connector flyout.
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
      await header.waitUntilLoadingHasFinished();
      await retry.waitFor('case-configure-title exist', async () => {
        return await testSubjects.exists('case-configure-title');
      });
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-settings',
        screenshotDirectories
      );

      // Templates list page — reachable when the templates flag is ON.
      // Strip any query string / hash so the sub-path is appended cleanly.
      const configureUrl = (await browser.getCurrentUrl()).split(/[?#]/)[0].replace(/\/$/, '');
      await browser.get(`${configureUrl}/templates`);
      await header.waitUntilLoadingHasFinished();
      await retry.waitFor('templates-table exist', async () => {
        return await testSubjects.exists('templates-table');
      });
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-templates',
        screenshotDirectories,
        1400,
        1000
      );

      // Field library page — reachable when the templates flag is ON.
      await browser.get(`${configureUrl}/field_library`);
      await header.waitUntilLoadingHasFinished();
      await retry.waitFor('fieldDefinitionsTable exist', async () => {
        return await testSubjects.exists('fieldDefinitionsTable');
      });
      await svlCommonScreenshots.takeScreenshot(
        'observability-cases-field-library',
        screenshotDirectories,
        1400,
        700
      );

      // Add-connector flyout on the settings page (unchanged by the flag).
      await browser.get(configureUrl);
      await header.waitUntilLoadingHasFinished();
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
