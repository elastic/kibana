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

  describe('Cloud Posture Rules Page - Counters', function () {
    this.tags(['cloud_security_posture_rules_page_counters']);
    let rule: typeof pageObjects.rule;
    let findings: typeof pageObjects.findings;
    let agentPolicyId: string;

    before(async () => {
      rule = pageObjects.rule;
      findings = pageObjects.findings;
      await findings.index.remove();

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
      await findings.index.add(k8sFindingsMock);
      await rule.navigateToRulePage('cis_k8s', '1.0.1');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({
        types: [
          'ingest-agent-policies',
          'fleet-agent-policies',
          'ingest-package-policies',
          'fleet-package-policies',
          'cloud-security-posture-settings',
        ],
      });
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    afterEach(async () => {
      await findings.index.remove();
    });

    describe('Rules Page - Rules Counters', () => {
      it('Shows posture score when there are findings', async () => {
        const isEmptyStateVisible = await rule.rulePage.getCountersEmptyState();
        expect(isEmptyStateVisible).to.be(false);

        const postureScoreCounter = await rule.rulePage.getPostureScoreCounter();
        expect((await postureScoreCounter.getVisibleText()).includes('33%')).to.be(true);
      });

      it('Clicking the posture score button leads to the dashboard', async () => {
        await retryService.tryForTime(5000, async () => {
          await rule.rulePage.clickPostureScoreButton();
          await pageObjects.common.waitUntilUrlIncludes('cloud_security_posture/dashboard');
        });
      });

      it('Shows integrations count when there are findings', async () => {
        const integrationsCounter = await rule.rulePage.getIntegrationsEvaluatedCounter();
        expect((await integrationsCounter.getVisibleText()).includes('1')).to.be(true);
      });

      it('Clicking the integrations counter button leads to the integration page', async () => {
        await rule.rulePage.clickIntegrationsEvaluatedButton();
        await pageObjects.common.waitUntilUrlIncludes('add-integration/kspm');
      });

      it('Shows the failed findings counter when there are findings', async () => {
        const failedFindingsCounter = await rule.rulePage.getFailedFindingsCounter();
        expect((await failedFindingsCounter.getVisibleText()).includes('2')).to.be(true);
      });

      it('Clicking the failed findings button leads to the findings page', async () => {
        await rule.rulePage.clickFailedFindingsButton();
        await pageObjects.common.waitUntilUrlIncludes(
          'cloud_security_posture/findings/configurations'
        );
      });

      it('Shows the disabled rules count', async () => {
        const disabledRulesCounter = await rule.rulePage.getDisabledRulesCounter();
        expect((await disabledRulesCounter.getVisibleText()).includes('0')).to.be(true);

        // disable rule 1.1.1 (k8s findings mock contains a findings from that rule)
        await rule.rulePage.clickEnableRulesRowSwitchButton(0);
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await disabledRulesCounter.getVisibleText()).includes('1')).to.be(true);

        const postureScoreCounter = await rule.rulePage.getPostureScoreCounter();
        expect((await postureScoreCounter.getVisibleText()).includes('0%')).to.be(true);

        // enable rule back
        await rule.rulePage.clickEnableRulesRowSwitchButton(0);
      });

      it('Clicking the disabled rules button shows enables the disabled filter', async () => {
        await rule.rulePage.clickEnableRulesRowSwitchButton(0);
        await pageObjects.header.waitUntilLoadingHasFinished();

        await rule.rulePage.clickDisabledRulesButton();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 1).to.be(true);
      });

      it('Shows empty state when there are no findings', async () => {
        // Ensure there are no findings initially
        await findings.index.remove();
        await rule.navigateToRulePage('cis_k8s', '1.0.1');

        const isEmptyStateVisible = await rule.rulePage.getCountersEmptyState();
        expect(isEmptyStateVisible).to.be(true);
        await rule.rulePage.clickEnableRulesRowSwitchButton(0);
      });
    });
  });
}
