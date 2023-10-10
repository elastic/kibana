/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const toasts = getService('toasts');
  const retry = getService('retry');

  describe('Configure Case', function () {
    //  Error: timed out waiting for assertRadioGroupValue: Expected the radio group value to equal "close-by-pushing"
    this.tags(['failsOnMKI']);
    before(async () => {
      await svlCommonPage.login();

      await svlObltNavigation.navigateToLandingPage();

      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await svlCommonPage.forceLogout();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/166469
    describe.skip('Closure options', function () {
      before(async () => {
        await common.clickAndValidate('configure-case-button', 'case-configure-title');
      });

      it('defaults the closure option correctly', async () => {
        await cases.common.assertRadioGroupValue('closure-options-radio-group', 'close-by-user');
      });

      it('change closure option successfully', async () => {
        await cases.common.selectRadioGroupValue('closure-options-radio-group', 'close-by-pushing');
        const toast = await toasts.getToastElement(1);
        expect(await toast.getVisibleText()).to.be('Saved external connection settings');
        await toasts.dismissAllToasts();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/167869
    describe.skip('Connectors', function () {
      it('defaults the connector to none correctly', async () => {
        await retry.waitFor('dropdown-connector-no-connector to exist', async () => {
          return await testSubjects.exists('dropdown-connector-no-connector');
        });
      });

      it('opens and closes the connectors flyout correctly', async () => {
        await common.clickAndValidate('dropdown-connectors', 'dropdown-connector-add-connector');
        await common.clickAndValidate('dropdown-connector-add-connector', 'euiFlyoutCloseButton');
        await testSubjects.click('euiFlyoutCloseButton');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);
      });
    });
  });
};
