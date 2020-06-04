/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpointAlerts']);
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('Endpoint Alert Page: when es has data and user has navigated to the page', function () {
    this.tags(['ciGroup7']);
    before(async () => {
      await esArchiver.load('endpoint/alerts/api_feature');
      await esArchiver.load('endpoint/alerts/host_api_feature');
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/alerts');
    });
    it('loads the Alert List Page', async () => {
      await testSubjects.existOrFail('alertListPage');
    });
    it('contains the Alert List Page title', async () => {
      const alertsTitle = await testSubjects.getVisibleText('alertsViewTitle');
      expect(alertsTitle).to.equal('Alerts');
    });
    it('includes alerts search bar', async () => {
      await testSubjects.existOrFail('alertsSearchBar');
    });
    it('includes Alert list data grid', async () => {
      await testSubjects.existOrFail('alertListGrid');
    });
    describe('when submitting a new bar query', () => {
      before(async () => {
        await pageObjects.endpointAlerts.enterSearchBarQuery('test query');
        await pageObjects.endpointAlerts.submitSearchBarFilter();
      });
      it('should update the url correctly', async () => {
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain('query=');
        expect(currentUrl).to.contain('date_range=');
      });
      after(async () => {
        await pageObjects.endpointAlerts.enterSearchBarQuery('');
        await pageObjects.endpointAlerts.submitSearchBarFilter();
      });
    });

    describe('and user has clicked details view link', () => {
      before(async () => {
        await pageObjects.endpointAlerts.setSearchBarDate('Mar 10, 2020 @ 19:33:40.767'); // A timestamp that encompases our es-archive data
        await testSubjects.click('alertTypeCellLink');
      });

      it('loads the Alert List Flyout correctly', async () => {
        await testSubjects.existOrFail('alertDetailFlyout');
      });

      it('loads the resolver component and renders at least a single node', async () => {
        await testSubjects.click('overviewResolverTab');
        await testSubjects.existOrFail('alertResolver');
        await testSubjects.existOrFail('resolverNode');
      });
    });

    after(async () => {
      await esArchiver.unload('endpoint/alerts/api_feature');
      await esArchiver.unload('endpoint/alerts/host_api_feature');
    });
  });
}
