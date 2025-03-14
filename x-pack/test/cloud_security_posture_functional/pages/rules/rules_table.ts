/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { createPackagePolicy } from '../../../api_integration/apis/cloud_security_posture/helper';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { k8sFindingsMock } from '../../mocks/latest_findings_mock';
import {
  RULES_BULK_ACTION_OPTION_DISABLE,
  RULES_BULK_ACTION_OPTION_ENABLE,
} from '../../page_objects/rule_page';

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
  const retryService = getService('retry');

  describe('Cloud Posture Rules Page - Table', function () {
    this.tags(['cloud_security_posture_rules_page_table']);
    let rule: typeof pageObjects.rule;
    let findings: typeof pageObjects.findings;
    let agentPolicyId: string;

    before(async () => {
      rule = pageObjects.rule;
      findings = pageObjects.findings;
      await findings.index.remove();

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
    });

    beforeEach(async () => {
      // cleanup agent and package policies
      await kibanaServer.savedObjects.clean({
        types: [
          'ingest-agent-policies',
          'fleet-agent-policies',
          'ingest-package-policies',
          'fleet-package-policies',
          'cloud-security-posture-settings',
        ],
      });
      await findings.index.add(k8sFindingsMock);
      await rule.navigateToRulePage('cis_k8s', '1.0.1');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: [
          'ingest-agent-policies',
          'fleet-agent-policies',
          'ingest-package-policies',
          'fleet-package-policies',
          'cloud-security-posture-settings',
        ],
      });
      await findings.index.remove();
    });

    describe('Rules Page - Bulk Action buttons', () => {
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

    describe('Rules Page - Flyout', () => {
      it('Users are able to Enable/Disable Rule from Switch on Rule Flyout', async () => {
        // Ensure that the first rule is enabled
        await rule.rulePage.togglEnableRulesRowSwitchButton(0, 'enable');
        await rule.rulePage.closeToasts();

        await rule.rulePage.clickRulesNames(0);
        await rule.rulePage.clickFlyoutEnableSwitchButton();
        await pageObjects.header.waitUntilLoadingHasFinished();

        expect((await rule.rulePage.getEnableSwitchButtonState()) === 'false').to.be(true);
        await rule.rulePage.clickCloseFlyoutButton();
      });
      it('Alerts section of Rules Flyout shows Disabled text when Rules are disabled', async () => {
        await rule.rulePage.togglEnableRulesRowSwitchButton(0, 'disable');
        await rule.rulePage.closeToasts();

        await rule.rulePage.clickRulesNames(0);
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await rule.rulePage.doesElementExist(
            'csp:findings-flyout-create-detection-rule-link'
          )) === false
        ).to.be(true);

        await rule.rulePage.clickCloseFlyoutButton();
      });
      it('Users are able to Enable/Disable Rule from Take Action on Rule Flyout', async () => {
        await rule.rulePage.togglEnableRulesRowSwitchButton(0, 'disable');
        await rule.rulePage.closeToasts();

        await rule.rulePage.clickRulesNames(0);
        await retryService.try(async () => {
          await rule.rulePage.clickTakeActionButton();
          await rule.rulePage.clickTakeActionButtonOption('enable');
        });
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableSwitchButtonState()) === 'true').to.be(true);

        await rule.rulePage.clickCloseFlyoutButton();
      });
      it('Alerts section of Rules Flyout shows Detection Rule Counter component when Rules are enabled', async () => {
        await rule.rulePage.clickRulesNames(0);
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await rule.rulePage.doesElementExist(
            'csp:findings-flyout-create-detection-rule-link'
          )) === true
        ).to.be(true);
      });
    });
  });
}
