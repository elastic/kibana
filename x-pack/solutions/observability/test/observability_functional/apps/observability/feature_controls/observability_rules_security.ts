/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  const PageObjects = getPageObjects([
    'common',
    'observability',
    'alertControls',
    'error',
    'security',
    'spaceSelector',
    'header',
  ]);
  const supertest = getService('supertest');

  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const logger = getService('log');

  const DATA_VIEW_1 = 'filebeat-*';
  const DATA_VIEW_1_ID = 'data-view-id_1';
  const DATA_VIEW_1_NAME = 'test-data-view-name_1';

  describe('observability security feature controls', function () {
    this.tags(['skipFirefox', 'skipFIPS']);
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await observability.alerts.common.createDataView({
        supertest,
        name: DATA_VIEW_1_NAME,
        id: DATA_VIEW_1_ID,
        title: DATA_VIEW_1,
        logger,
      });
      await observability.alerts.common.createRule({
        supertest,
        name: 'Test rule',
        id: '4c32e6b0-c3c5-11eb-b389-3fadeeafa60g',
        logger,
      });
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      // Since the above unload removes the default config,
      // the following command will set it back to avoid changing the test environment
    });

    describe('observability alerts all privileges', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityManageRules: ['all'],
            logs: ['all'],
            apm: ['all'],
          })
        );
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('shows observability/alerts navlink', async () => {
        await observability.alerts.common.navigateToTimeWithData();
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Alerts');
      });

      it(`landing page shows "Create new rule" button`, async () => {
        await observability.alerts.common.navigateToRulesPage();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.exists('createRuleButton')).to.be(true);
      });

      it(`allows a custom threshold rule to be created`, async () => {
        await testSubjects.click('createRuleButton');
        await testSubjects.click('observability.rules.custom_threshold-SelectOption');
        await testSubjects.existOrFail('ruleForm');
      });

      it(`allows a rule to be edited`, async () => {
        await PageObjects.common.navigateToUrl(
          'observability',
          'alerts/rules/4c32e6b0-c3c5-11eb-b389-3fadeeafa60g',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        await testSubjects.existOrFail('actions');
      });
    });

    describe('observability alerts read-only privileges', function () {
      this.tags('skipFIPS');
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
        );
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityManageRules: ['read'],
            logs: ['read'],
          })
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
        );
        await observability.users.restoreDefaultTestUserRole();
      });

      it('shows observability/alerts navlink', async () => {
        await observability.alerts.common.navigateToTimeWithData();
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Alerts');
      });

      it(`landing page shows "Create new rule" button`, async () => {
        await observability.alerts.common.navigateToRulesPage();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const button = await testSubjects.find('createRuleButton', 20000);
        const disabledAttr = await button.getAttribute('disabled');
        expect(disabledAttr).to.be('true');
      });

      it(`does not allow a rule to be edited`, async () => {
        await PageObjects.common.navigateToUrl(
          'observability',
          'alerts/rules/4c32e6b0-c3c5-11eb-b389-3fadeeafa60g',
          {
            shouldUseHashForSubUrl: false,
          }
        );
        await testSubjects.missingOrFail('createRuleButton');
      });
    });
  });
}
