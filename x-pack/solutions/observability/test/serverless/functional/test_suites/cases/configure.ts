/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const header = getPageObject('header');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const toasts = getService('toasts');
  const retry = getService('retry');

  const navigateToConfigure = async () => {
    await svlObltNavigation.navigateToLandingPage();
    await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
    await header.waitUntilLoadingHasFinished();

    await cases.navigation.clickHeaderMenuItem('configure-case-button');
    await header.waitUntilLoadingHasFinished();

    await retry.waitFor('the configuration page to load', async () => {
      return (
        (await testSubjects.exists('case-configure-title')) ||
        (await testSubjects.exists('cases-redesign-settings-panel'))
      );
    });
  };

  describe('Configure Case', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await navigateToConfigure();
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    describe('Closure options', function () {
      it('defaults the closure option correctly', async () => {
        await cases.common.assertClosureOption('close-by-user');
      });

      it('change closure option successfully', async () => {
        await cases.common.selectClosureOption('close-by-pushing');
        const toast = await toasts.getElementByIndex(1);
        expect(await toast.getVisibleText()).to.be('Settings successfully updated');
        await toasts.dismissAll();
      });
    });

    describe('Connectors', function () {
      it('defaults the connector to none correctly', async () => {
        await retry.waitFor('dropdown-connector-no-connector to exist', async () => {
          return await testSubjects.exists('dropdown-connector-no-connector-label');
        });
      });

      it('opens and closes the connectors flyout correctly', async () => {
        await common.clickAndValidate('add-new-connector', 'euiFlyoutCloseButton');
        await testSubjects.click('euiFlyoutCloseButton');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);
      });
    });

    // With the templates feature flag pinned ON for this suite, custom fields and
    // templates are managed on the dedicated v2 templates / field-library pages,
    // not inline on the Case Settings page. The legacy in-page flow is covered by
    // the flag-OFF stateful `configure_legacy.ts` suite.
    describe('Templates page (v2)', function () {
      before(async () => {
        await navigateToConfigure();
        // The cases app pathname already ends with `configure`, so append the
        // sub-path after stripping any query string / hash.
        const configureUrl = (await browser.getCurrentUrl()).split(/[?#]/)[0].replace(/\/$/, '');
        await browser.get(`${configureUrl}/templates`);
        await header.waitUntilLoadingHasFinished();
      });

      it('renders the templates list page with the empty prompt', async () => {
        await testSubjects.existOrFail('templates-table-empty-prompt-no-templates');
        await testSubjects.existOrFail('templates-table-add-template');
      });

      it('exposes the templates table', async () => {
        await testSubjects.existOrFail('templates-table');
      });
    });

    describe('Field library page (v2)', function () {
      before(async () => {
        await navigateToConfigure();
        const configureUrl = (await browser.getCurrentUrl()).split(/[?#]/)[0].replace(/\/$/, '');
        await browser.get(`${configureUrl}/field_library`);
        await header.waitUntilLoadingHasFinished();
      });

      it('renders the field library page with its create affordance', async () => {
        await testSubjects.existOrFail('fieldDefinitionsTable');
        await testSubjects.existOrFail('createFieldDefinitionButton');
      });
    });
  });
};
