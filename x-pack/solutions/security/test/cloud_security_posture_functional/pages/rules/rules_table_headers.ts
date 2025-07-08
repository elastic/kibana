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

  // Failing: See https://github.com/elastic/kibana/issues/220524
  describe.skip('Cloud Posture Rules Page - Table Headers', function () {
    this.tags(['cloud_security_posture_rules_page_table_headers']);
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

    describe('Rules Page - Enable Rules and Disabled Rules Filter Toggle', () => {
      it('Should only display Enabled rules when Enabled Rules filter is ON', async () => {
        await rule.rulePage.clickFilterButton('enabled');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 25).to.be(true);
      });

      it('Should only display Disabled rules when Disabled Rules filter is ON', async () => {
        await rule.rulePage.clickFilterButton('disabled');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 0).to.be(true);
      });
    });

    describe('Rules Page - CIS Section & Rule Number filters', () => {
      it('Table should only show result that has the same section as in the Section filter', async () => {
        await rule.rulePage.closeToasts();
        await rule.rulePage.clickFilterPopover('section');
        await rule.rulePage.clickFilterPopOverOption('etcd');
        await rule.rulePage.clickFilterPopOverOption('Scheduler');
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) < 10).to.be(true);
      });

      it('Table should only show result that has the same section as in the Rule number filter', async () => {
        await rule.rulePage.closeToasts();
        await rule.rulePage.clickFilterPopover('ruleNumber');
        await rule.rulePage.clickFilterPopOverOption('1.1.1');
        await rule.rulePage.clickFilterPopOverOption('1.1.2');
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 2).to.be(true);
      });

      it('Table should only show result that passes both Section and Rule number filter', async () => {
        await rule.rulePage.closeToasts();
        await rule.rulePage.clickFilterPopover('section');
        await rule.rulePage.clickFilterPopOverOption('Control-Plane-Node-Configuration-Files');
        await rule.rulePage.clickFilterPopover('section');
        await rule.rulePage.clickFilterPopover('ruleNumber');
        await rule.rulePage.clickFilterPopOverOption('1.1.5');
        expect((await rule.rulePage.getEnableRulesRowSwitchButton()) === 1).to.be(true);
      });
    });
  });
}
