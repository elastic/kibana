/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * - Agent/Package policies names are defined in the config file
 * - Integration name is defined in the cloud_security_posture integration manifest
 */
const NAMES = {
  AGENT_POLICY_0: 'example-agent-policy-00',
  AGENT_POLICY_1: 'example-agent-policy-01',
  PACKAGE_POLICY_0: 'example-integration-00',
  PACKAGE_POLICY_01: 'example-integration-01',
  INTEGRATION: 'Kubernetes Security Posture Management',
  INTEGRATION_TYPE: 'Unmanaged Kubernetes',
} as const;

// Defined in CSP Plugin
export const BENCHMARKS_TABLE_COLUMNS = {
  INTEGRATION_NAME: 'benchmarks-table-column-integration-name',
  DEPLOYMENT_TYPE: 'benchmarks-table-column-deployment-type',
  AGENT_POLICY: 'benchmarks-table-column-agent-policy',
  NUMBER_OF_AGENTS: 'benchmarks-table-column-number-of-agents',
  CREATED_BY: 'benchmarks-table-column-created-by',
  CREATED_AT: 'benchmarks-table-column-created-at',
} as const;

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['benchmarks', 'fleetIntegration']);

  describe('Benchmarks Page', () => {
    describe('Navigation', () => {
      it('navigates to CSP Benchmarks page', async () => {
        await pageObjects.benchmarks.goToBenchmarkPage();
        await pageObjects.benchmarks.assertBenchmarkPageExists();
      });

      it('navigates to Fleet Add Integration page', async () => {
        await pageObjects.benchmarks.goToBenchmarkPage();
        await pageObjects.benchmarks.goToNewIntegrationPage();
        await pageObjects.fleetIntegration.assertAddIntegrationPageExists(NAMES.INTEGRATION);
      });

      it('navigates to Fleet Agent Policy page', async () => {
        await pageObjects.benchmarks.goToBenchmarkPage();
        await pageObjects.benchmarks.goToIntegrationAgentPolicyPage();
        await pageObjects.fleetIntegration.assertAgentPolicyPageExists(NAMES.AGENT_POLICY_0);
      });

      it("navigates to an integration's rules page", async () => {
        await pageObjects.benchmarks.goToBenchmarkPage();
        await pageObjects.benchmarks.goToIntegrationRulesPage();
        await pageObjects.benchmarks.assertRulePageExists();
      });
    });

    describe('Table Data', () => {
      before(async () => {
        await pageObjects.benchmarks.goToBenchmarkPage();
      });

      it('displays integration name column', async () => {
        await pageObjects.benchmarks.assertTableColumnValueExists(
          BENCHMARKS_TABLE_COLUMNS.INTEGRATION_NAME,
          NAMES.PACKAGE_POLICY_0
        );
      });

      it('displays integration type column', async () => {
        await pageObjects.benchmarks.assertTableColumnValueExists(
          BENCHMARKS_TABLE_COLUMNS.DEPLOYMENT_TYPE,
          NAMES.INTEGRATION_TYPE
        );
      });

      it('displays agent policy name column', async () => {
        await pageObjects.benchmarks.assertTableColumnValueExists(
          BENCHMARKS_TABLE_COLUMNS.AGENT_POLICY,
          NAMES.AGENT_POLICY_0
        );
      });

      it('displays agents count column', async () => {
        await pageObjects.benchmarks.assertTableColumnValueExists(
          BENCHMARKS_TABLE_COLUMNS.NUMBER_OF_AGENTS,
          '0' // No agents should be enrolled
        );
      });

      it('displays created by column', async () => {
        await pageObjects.benchmarks.assertTableColumnValueExists(
          BENCHMARKS_TABLE_COLUMNS.CREATED_BY,
          'system' // default user for installing pre-configured integrations
        );
      });
    });

    describe.skip('Table Pagination', async () => {
      it('set page size', async () => {
        await pageObjects.benchmarks.assertIntegrationCountExists(10, 11);
        await pageObjects.benchmarks.setPageSize(25);
        await pageObjects.benchmarks.assertIntegrationCountExists(11, 11);
      });

      it('move to next and previous pages', async () => {
        await pageObjects.benchmarks.setPageSize(10);
        await pageObjects.benchmarks.goToNextPage();
        await pageObjects.benchmarks.assertIntegrationCountExists(1, 11);
        await pageObjects.benchmarks.goToPreviousPage();
        await pageObjects.benchmarks.assertIntegrationCountExists(10, 11);
      });
    });

    describe('Table Sort', async () => {
      it('sort by integration name', async () => {
        await pageObjects.benchmarks.goToBenchmarkPage();
        await pageObjects.benchmarks.assertRowIntegrationName(0, NAMES.PACKAGE_POLICY_0);
        await pageObjects.benchmarks.assertRowIntegrationName(1, NAMES.PACKAGE_POLICY_01);
        await pageObjects.benchmarks.toggleSortByName();
        await pageObjects.benchmarks.assertRowIntegrationName(0, NAMES.PACKAGE_POLICY_01);
        await pageObjects.benchmarks.assertRowIntegrationName(1, NAMES.PACKAGE_POLICY_0);
      });
    });

    describe('Search', () => {
      it('displays all results', async () => {
        await pageObjects.benchmarks.filterBenchmarks('');
        await pageObjects.benchmarks.assertIntegrationCountExists(2, 2);
      });

      it('displays filters results', async () => {
        await pageObjects.benchmarks.filterBenchmarks(NAMES.PACKAGE_POLICY_01);
        await pageObjects.benchmarks.assertIntegrationCountExists(1, 1);
      });
    });
  });
}
