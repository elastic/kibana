/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const svlUserManager = getService('svlUserManager');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const samlAuth = getService('samlAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;

  function createESQueryRule({ ruleName }: { ruleName: string }) {
    it('navigates to the rules page', async () => {
      await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
      await testSubjects.click('manageRulesPageButton');
    });

    it('should open the rule creation flyout', async () => {
      await testSubjects.click('createRuleButton');
      const isCreateRuleFlyoutVisible = await testSubjects.exists('ruleTypeModal');
      expect(isCreateRuleFlyoutVisible).toBe(true);
    });

    it('should click the es query rule type', async () => {
      await testSubjects.click('.es-query-SelectOption');
      const ruleType = await testSubjects.getVisibleText('ruleDefinitionHeaderRuleTypeName');
      expect(ruleType).toEqual('Elasticsearch query');
    });

    it('should create a new es query rule', async () => {
      await testSubjects.click('queryFormType_searchSource');
      await testSubjects.exists('selectDataViewExpression');
      const input = await testSubjects.find('ruleDetailsNameInput');
      await input.clearValueWithKeyboard();
      await testSubjects.setValue('ruleDetailsNameInput', ruleName);
      await retry.try(async () => {
        await testSubjects.click('rulePageFooterSaveButton');
        const doesConfirmModalExist = await testSubjects.exists('confirmModalConfirmButton');
        expect(doesConfirmModalExist).toBe(true);
      });
      await testSubjects.click('confirmModalConfirmButton');
      const name = await testSubjects.getVisibleText('ruleName');
      expect(name).toEqual(ruleName);
    });
  }

  // FLAKY: https://github.com/elastic/kibana/issues/225813
  describe.skip('ES Query rule - consumers', function () {
    // custom roles are not yet supported in MKI
    this.tags(['skipMKI']);
    const ruleIdList: string[] = [];

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      await kibanaServer.savedObjects.cleanStandardList();
      // re-create the default data view in case it has been cleaned up by another test
      await dataViewApi.create({
        id: 'default_all_data_id',
        name: 'default:all-data',
        title: '*,-.*',
      });
    });

    afterEach(async () => {
      await Promise.all(
        ruleIdList.map(async (ruleId) => {
          await supertest
            .delete(`/api/alerting/rule/${ruleId}`)
            .set('kbn-xsrf', 'foo')
            .set('x-elastic-internal-origin', 'foo');
        })
      );
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('both logs and infrastructure privileges', () => {
      const uuid = ` ${uuidv4()}`;
      const ruleName = `ES Query rule${uuid}`;
      it('logs in with privileged role', async () => {
        await svlCommonPage.loginWithPrivilegedRole();
      });

      createESQueryRule({ ruleName });

      it('should have logs consumer by default', async () => {
        const searchResults = await alertingApi.searchRules(
          roleAuthc,
          `alert.attributes.name:"${ruleName}"`
        );
        const rule = searchResults.body.data[0];
        expect(rule.consumer).toEqual('logs');
        ruleIdList.push(rule.id);
      });
    });

    describe('only logs privileges', () => {
      const uuid = ` ${uuidv4()}`;
      const ruleName = `ES Query rule${uuid}`;
      it('logs in with logs only role', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);

        await svlCommonPage.loginWithCustomRole();
      });

      createESQueryRule({ ruleName });

      it('should have logs consumer by default', async () => {
        const searchResults = await alertingApi.searchRules(
          roleAuthc,
          `alert.attributes.name:"${ruleName}"`
        );
        const rule = searchResults.body.data[0];
        expect(rule.consumer).toEqual('logs');
        ruleIdList.push(rule.id);
      });
    });

    describe('only infrastructure privileges', () => {
      const uuid = ` ${uuidv4()}`;
      const ruleName = `ES Query rule${uuid}`;

      it('logs in with infra only role', async () => {
        await samlAuth.setCustomRole(ROLES.infra_only);

        await svlCommonPage.loginWithCustomRole();
      });

      createESQueryRule({ ruleName });

      it('should have infrastructure consumer by default', async () => {
        const searchResults = await alertingApi.searchRules(
          roleAuthc,
          `alert.attributes.name:"${ruleName}"`
        );
        const rule = searchResults.body.data[0];
        expect(rule.consumer).toEqual('infrastructure');
        ruleIdList.push(rule.id);
      });
    });
  });
};

export const ROLES = {
  infra_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          actions: ['all'],
          maintenanceWindow: ['all'],
          observabilityCasesV3: ['all'],
          indexPatterns: ['all'],
          infrastructure: ['all'],
        },
      },
    ],
  },
  logs_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          actions: ['all'],
          maintenanceWindow: ['all'],
          observabilityCasesV3: ['all'],
          indexPatterns: ['all'],
          logs: ['all'],
        },
      },
    ],
  },
  synthetics_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          actions: ['all'],
          maintenanceWindow: ['all'],
          observabilityCasesV3: ['all'],
          uptime: ['all'],
        },
      },
    ],
  },
};
