/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';
import {
  obltAppAll,
  obltAppRead,
  obltDiscoverRead,
  obltInfraRead,
  obltUptimeRead,
  obltSLORead,
  obltDiscover2Read,
} from './utils/privileges/roles';
export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlTriggersActionsUI = getPageObject('svlTriggersActionsUI');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const svlUserManager = getService('svlUserManager');
  const alertingApi = getService('alertingApi');
  let roleAuthc: RoleCredentials;

  async function refreshRulesList() {
    const existsClearFilter = await testSubjects.exists('rules-list-clear-filter');
    if (existsClearFilter) {
      await testSubjects.click('rules-list-clear-filter');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
    }
    await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
    await testSubjects.click('manageRulesPageButton');
  }

  describe('Custom roles', () => {
    let ruleIdList: string[];

    // before(async () => { });

    afterEach(async () => {
      if (ruleIdList && ruleIdList.length > 0) {
        await Promise.all(
          ruleIdList.map(async (ruleId) => {
            await supertest
              .delete(`/api/alerting/rule/${ruleId}`)
              .set('kbn-xsrf', 'foo')
              .set('x-elastic-internal-origin', 'foo');
          })
        );
      }
    });

    after(async () => {
      if (roleAuthc) {
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      }
      await svlUserManager.deleteCustomRole();
    });

    it('APM.READ - should not be able to create a rule', async () => {
      await svlUserManager.setCustomRole(obltAppRead.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:alerts' });
      await testSubjects.click('manageRulesPageButton');
      const isEnabled = await testSubjects.isEnabled('createRuleButton');
      expect(isEnabled).toBeFalsy();
    });

    it('DISCOVER.READ - should not be able to see Alerts side nav', async () => {
      await svlUserManager.setCustomRole(obltDiscoverRead.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await expect(find.byCssSelector('#observability-overview\\:alerts')).rejects.toThrow();
    });

    it('DISCOVER2.READ - should not be able to create a rule', async () => {
      await svlUserManager.setCustomRole(obltDiscover2Read.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await expect(find.byCssSelector('#observability-overview\\:alerts')).rejects.toThrow();
    });

    it('UPTIME.READ - should not see Alert table navigation', async () => {
      await svlUserManager.setCustomRole(obltUptimeRead.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await expect(find.byCssSelector('#observability-overview\\:alerts')).rejects.toThrow();
    });

    it('SLO.READ - should not be able to create a rule', async () => {
      await svlUserManager.setCustomRole(obltSLORead.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:alerts' });
      await testSubjects.click('manageRulesPageButton');
      const isEnabled = await testSubjects.isEnabled('createRuleButton');
      expect(isEnabled).toBeFalsy();
    });

    it('INFRA.READ - should not be able to create a rule', async () => {
      await svlUserManager.setCustomRole(obltInfraRead.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:alerts' });
      await testSubjects.click('manageRulesPageButton');
      const isEnabled = await testSubjects.isEnabled('createRuleButton');
      expect(isEnabled).toBeFalsy();
    });

    it('APM.ALL - should see all the rules except Anomaly Detection rule', async () => {
      await svlUserManager.setCustomRole(obltAppAll.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
      await testSubjects.click('manageRulesPageButton');
      await testSubjects.click('createRuleButton');
      await testSubjects.existOrFail('apm.transaction_duration-SelectOption');
      await testSubjects.existOrFail('apm.anomaly-SelectOption');
      await testSubjects.existOrFail('apm.error_rate-SelectOption');
      await testSubjects.existOrFail('apm.transaction_error_rate-SelectOption');
      await testSubjects.existOrFail('observability.rules.custom_threshold-SelectOption');
      await testSubjects.existOrFail('.es-query-SelectOption');
      await testSubjects.existOrFail('metrics.alert.inventory.threshold-SelectOption');
      await testSubjects.existOrFail('slo.rules.burnRate-SelectOption');
      await testSubjects.existOrFail('xpack.synthetics.alerts.monitorStatus-SelectOption');
      await testSubjects.existOrFail('xpack.synthetics.alerts.tls-SelectOption');
    });

    it('APM.ALL can create an ESQL rule', async () => {
      await svlUserManager.setCustomRole(obltAppAll.privileges);
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('customRole');
      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      const esQuery = await alertingApi.helpers.createEsQueryRule({
        roleAuthc,
        name: 'ES Query',
        consumer: 'observability',
        ruleTypeId: '.es-query',
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
      });
      ruleIdList = [esQuery.id];

      await svlCommonPage.loginWithCustomRole();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
      await testSubjects.existOrFail('alertsTable');
      const firstRowAlert = await find.byCssSelector('.euiDataGridRow[data-grid-row-index="0"]');
      expect(firstRowAlert).toBeTruthy();
      await refreshRulesList();
      const searchResults = await svlTriggersActionsUI.getRulesList();
      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual('ES QueryElasticsearch query');
    });
  });
};
