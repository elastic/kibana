/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { createPackagePolicy } from '../../api_integration/apis/cloud_security_posture/helper';
import type { FtrProviderContext } from '../ftr_provider_context';
import {
  RULES_BULK_ACTION_OPTION_DISABLE,
  RULES_BULK_ACTION_OPTION_ENABLE,
} from '../page_objects/rule_page';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects([
    'common',
    'cloudPostureDashboard',
    'rule',
    'header',
    'findings',
  ]);

  describe('Cloud Posture Rules Page', function () {
    this.tags(['cloud_security_posture_rules_page']);
    let rule: typeof pageObjects.rule;

    let agentPolicyId: string;

    beforeEach(async () => {
      rule = pageObjects.rule;
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );
      await rule.waitForPluginInitialized();
      await rule.navigateToRulePage('cis_k8s', '1.0.1');
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('Rules Page - Bulk Action buttons', () => {
      it('It should disable both Enable and Disable options when there are no rules selected', async () => {
        await rule.rulePage.toggleBulkActionButton();
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_ENABLE)) ===
            'true'
        ).to.be(true);
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_DISABLE)) ===
            'true'
        ).to.be(true);
      });

      it('It should disable Enable option when there are all rules selected are already enabled ', async () => {
        await rule.rulePage.clickSelectAllRules();
        await rule.rulePage.toggleBulkActionButton();
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_ENABLE)) ===
            'true'
        ).to.be(true);
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_DISABLE)) ===
            'true'
        ).to.be(false);
      });

      it('It should disable Disable option when there are all rules selected are already Disabled', async () => {
        await rule.rulePage.clickSelectAllRules();
        await rule.rulePage.toggleBulkActionButton();
        await rule.rulePage.clickBulkActionOption(RULES_BULK_ACTION_OPTION_DISABLE);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await rule.rulePage.clickSelectAllRules();
        await rule.rulePage.toggleBulkActionButton();
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_ENABLE)) ===
            'true'
        ).to.be(false);
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_DISABLE)) ===
            'true'
        ).to.be(true);
      });

      it('Both option should not be disabled if selected rules contains both enabled and disabled rules', async () => {
        await rule.rulePage.clickEnableRulesRowSwitchButton(0);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await rule.rulePage.clickSelectAllRules();
        await rule.rulePage.toggleBulkActionButton();
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_ENABLE)) ===
            'true'
        ).to.be(false);
        expect(
          (await rule.rulePage.isBulkActionOptionDisabled(RULES_BULK_ACTION_OPTION_DISABLE)) ===
            'true'
        ).to.be(false);
      });
    });

    describe('Rules Page - Enable Rules and Disabled Rules Filter Toggle', () => {
      it('Should only display Enabled rules when Enabled Rules filter is ON', async () => {
        await rule.rulePage.clickFilterButton('enabled');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 1).to.be(true);
      });

      it('Should only display Disabled rules when Disabled Rules filter is ON', async () => {
        await rule.rulePage.clickFilterButton('disabled');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) > 1).to.be(true);
      });
    });

    describe('Rules Page - CIS Section & Rule Number filters', () => {
      it('Table should only show result that has the same section as in the Section filter', async () => {
        await rule.rulePage.clickFilterPopover('section');
        await rule.rulePage.clickFilterPopOverOption('etcd');
        await rule.rulePage.clickFilterPopOverOption('Scheduler');
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) < 10).to.be(true);
      });

      it('Table should only show result that has the same section as in the Rule number filter', async () => {
        await rule.rulePage.clickFilterPopover('ruleNumber');
        await rule.rulePage.clickFilterPopOverOption('1.1.1');
        await rule.rulePage.clickFilterPopOverOption('1.1.2');
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 2).to.be(true);
      });

      it('Table should only show result that passes both Section and Rule number filter', async () => {
        await rule.rulePage.clickFilterPopover('section');
        await rule.rulePage.clickFilterPopOverOption('Control-Plane-Node-Configuration-Files');
        await rule.rulePage.clickFilterPopover('section');
        await rule.rulePage.clickFilterPopover('ruleNumber');
        await rule.rulePage.clickFilterPopOverOption('1.1.5');
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 1).to.be(true);
      });
    });

    describe('Rules Page - Flyout', () => {
      it('Users are able to Enable/Disable Rule from Switch on Rule Flyout', async () => {
        await rule.rulePage.clickRulesNames(0);
        await rule.rulePage.clickFlyoutEnableSwitchButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableSwitchButtonState()) === 'false').to.be(true);
      });
      it('Users are able to Enable/Disable Rule from Take Action on Rule Flyout', async () => {
        await rule.rulePage.clickRulesNames(0);
        await rule.rulePage.clickTakeActionButton();
        await rule.rulePage.clickTakeActionButtonOption('enable');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableSwitchButtonState()) === 'true').to.be(true);
      });
    });
  });
}
