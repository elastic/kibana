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
  const kibanaServer = getService('kibanaServer');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;

  function createCustomThresholdRule({ ruleName }: { ruleName: string }) {
    it('navigates to the rules page', async () => {
      await retry.try(async () => {
        await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
        expect(await testSubjects.exists('manageRulesPageButton')).toBeTruthy();
        await testSubjects.click('manageRulesPageButton');
      });
    });

    it('should open the rule creation flyout', async () => {
      await retry.try(async () => {
        await testSubjects.click('createRuleButton');
        const isCreateRuleFlyoutVisible = await testSubjects.exists('ruleTypeModal');
        expect(isCreateRuleFlyoutVisible).toBe(true);
      });
    });

    it('should click the custom threshold rule type', async () => {
      await testSubjects.click('observability.rules.custom_threshold-SelectOption');
      const ruleType = await testSubjects.getVisibleText('ruleDefinitionHeaderRuleTypeName');
      expect(ruleType).toEqual('Custom threshold');
      await testSubjects.exists('selectDataViewExpression');
    });

    it('should create a new custom threshold rule', async () => {
      const input = await testSubjects.find('ruleDetailsNameInput');
      await input.clearValueWithKeyboard();
      await testSubjects.setValue('ruleDetailsNameInput', ruleName);
      await retry.try(async () => {
        await testSubjects.click('rulePageFooterSaveButton');
        const doesConfirmModalExist = await testSubjects.exists('confirmModalConfirmButton');
        expect(doesConfirmModalExist).toBe(true);
        await testSubjects.click('confirmModalConfirmButton');
        const name = await testSubjects.getVisibleText('ruleName');
        expect(name).toEqual(ruleName);
      });
    });
  }

  describe('Custom threshold rule - consumers', function () {
    // custom roles are not yet supported in MKI
    this.tags(['skipMKI']);
    const ruleIdList: string[] = [];

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      // re-create the default data view in case it has been cleaned up by another test
      await dataViewApi.create({
        id: 'default_all_data_id',
        name: 'default:all-data',
        title: '*,-.*',
      });
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
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
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('both logs and infrastructure privileges', () => {
      const uuid = ` ${uuidv4()}`;
      const ruleName = `Custom threshold rule${uuid}`;
      it('logs in with privileged role', async () => {
        await svlCommonPage.loginWithPrivilegedRole();
      });

      createCustomThresholdRule({ ruleName });

      it('should have logs consumer by default', async () => {
        const searchResults = (await alertingApi.searchRules(
          roleAuthc,
          `alert.attributes.name:"${ruleName}"`
        )) as { body: { data: Array<{ consumer: string; id: string }> } };
        const rule = searchResults.body.data[0];
        expect(rule.consumer).toEqual('logs');
        ruleIdList.push(rule.id);
      });
    });

    describe('only logs privileges', () => {
      const uuid = ` ${uuidv4()}`;
      const ruleName = `Custom threshold rule${uuid}`;
      it('logs in with logs only role', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);

        await svlCommonPage.loginWithCustomRole();
      });

      createCustomThresholdRule({ ruleName });

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
      const ruleName = `Custom threshold rule${uuid}`;

      it('logs in with infra only role', async () => {
        await samlAuth.setCustomRole(ROLES.infra_only);

        await svlCommonPage.loginWithCustomRole();
      });

      createCustomThresholdRule({ ruleName });

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
          infrastructure: ['all'],
          indexPatterns: ['all'],
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
          logs: ['all'],
          indexPatterns: ['all'],
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
