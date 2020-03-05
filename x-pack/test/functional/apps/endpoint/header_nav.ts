/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const testSubjects = getService('testSubjects');

  describe('Header nav', function() {
    this.tags('ciGroup7');
    before(async () => {
      await pageObjects.common.navigateToApp('endpoint');
    });

    it('renders the tabs when the app loads', async () => {
      const homeTabText = await testSubjects.getVisibleText('homeEndpointTab');
      const managementTabText = await testSubjects.getVisibleText('managementEndpointTab');
      const alertsTabText = await testSubjects.getVisibleText('alertsEndpointTab');
      const policiesTabText = await testSubjects.getVisibleText('policiesEndpointTab');

      expect(homeTabText.trim()).to.be('Home');
      expect(managementTabText.trim()).to.be('Management');
      expect(alertsTabText.trim()).to.be('Alerts');
      expect(policiesTabText.trim()).to.be('Policies');
    });

    it('renders the management page when the Management tab is selected', async () => {
      await (await testSubjects.find('managementEndpointTab')).click();
      await testSubjects.existOrFail('managementViewTitle');
    });

    it('renders the alerts page when the Alerts tab is selected', async () => {
      await (await testSubjects.find('alertsEndpointTab')).click();
      await testSubjects.existOrFail('alertListPage');
    });

    it('renders the policy page when Policy tab is selected', async () => {
      await (await testSubjects.find('policiesEndpointTab')).click();
      await testSubjects.existOrFail('policyViewTitle');
    });

    it('renders the home page when Home tab is selected after selecting another tab', async () => {
      await (await testSubjects.find('managementEndpointTab')).click();
      await testSubjects.existOrFail('managementViewTitle');

      await (await testSubjects.find('homeEndpointTab')).click();
      await testSubjects.existOrFail('welcomeTitle');
    });
  });
};
