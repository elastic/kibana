/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '@kbn/cloud-security-posture-plugin/common/constants';
import {
  type PackageInfo,
  type AgentPolicy,
  type PackagePolicy,
  agentPolicyRouteService,
  packagePolicyRouteService,
  epmRouteService,
} from '@kbn/fleet-plugin/common';
import { packageToPackagePolicy } from '@kbn/fleet-plugin/common/services/package_to_package_policy';

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const cloudPosture = getService('cloudPosture');
  const supertest = getService('supertest');

  /**
   * generates csp-00, csp01, csp-02, etc.
   * needed for easier table sorting assertions
   * */
  const id = (
    (n: number) => () =>
      `csp-${String(n++).padStart(2, '0')}`
  )(0);

  const getAgentPolicyName = (name: string) => `${name}-agent-policy`;

  let packageInfo: PackageInfo;
  let basePackagePolicy: PackagePolicy;

  const createAgentPolicy = (name: string) =>
    supertest
      .post(agentPolicyRouteService.getCreatePath())
      .set('kbn-xsrf', 'true')
      .send({ name, description: '', namespace: 'default' })
      .expect(200)
      .then<AgentPolicy>((res) => res.body.item);

  const getPackageInfo = () =>
    supertest
      .get(epmRouteService.getInfoPath(CLOUD_SECURITY_POSTURE_PACKAGE_NAME))
      .set('kbn-xsrf', 'xxxx')
      .expect(200)
      .then<PackageInfo>((response) => response.body.item);

  /**
   * creates agent policy + package policy
   * cleaned by cleanStandardList
   */
  const installKSPM = async (name: string) => {
    const agentPolicy = await createAgentPolicy(getAgentPolicyName(name));

    return supertest
      .post(packagePolicyRouteService.getCreatePath())
      .set('kbn-xsrf', 'xxxx')
      .send(packageToPackagePolicy(packageInfo, agentPolicy.id, 'default', name))
      .expect(200)
      .then<PackagePolicy>((response) => response.body.item);
  };

  /**
   * The order of 'describe' matters. state is kept to the next 'describe' block.
   * we use this to avoid installing an integration for each test
   */
  describe('Benchmarks Page', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Errors handling', () => {
      it('displays empty prompt when no integration is installed', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();
        await cloudPosture.benchmarks.assertEmptyPromptExists();
      });
    });

    describe('Navigation', async () => {
      before(async () => {
        /**
         * This is the first installation of the integration.
         * other test assume it is installed
         */
        packageInfo = await getPackageInfo();
        basePackagePolicy = await installKSPM(id());
      });

      it('navigates to CSP Benchmarks page', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();
        await cloudPosture.benchmarks.assertBenchmarkPageExists();
      });

      it('navigates from CSP Benchmarks page to Fleet Add Integration page', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();
        await cloudPosture.benchmarks.goToNewIntegrationPage();
        // TODO: add assertion
      });

      it('navigates from CSP Benchmarks page to Fleet Agent Policy page', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();
        await cloudPosture.benchmarks.goToIntegrationAgentPolicyPage();
        // TODO: add assertion
      });
    });

    describe('Table Data', () => {
      /** Tests below use integration 'csp-00' (first installed) */

      it('displays integration name column', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();
        await cloudPosture.benchmarks.assertTableColumnValueExists(
          'benchmarks-table-column-integration',
          'csp-00'
        );
      });

      it('displays integration type column', async () => {
        await cloudPosture.benchmarks.assertTableColumnValueExists(
          'benchmarks-table-column-integration_type',
          'Kubernetes Security Posture Management'
        );
      });

      it('displays agent policy name column', async () => {
        await cloudPosture.benchmarks.assertTableColumnValueExists(
          'benchmarks-table-column-agent-policy',
          getAgentPolicyName('csp-00')
        );
      });

      it('displays agents count column', async () => {
        await cloudPosture.benchmarks.assertTableColumnValueExists(
          'benchmarks-table-column-number-of-agents',
          '0' // No agents should be enrolled
        );
      });

      it('displays created by column', async () => {
        await cloudPosture.benchmarks.assertTableColumnValueExists(
          'benchmarks-table-column-created-by',
          basePackagePolicy.created_by // TODO: create user explicity
        );
      });

      it.skip('created time column is displayed', async () => {
        // UI is formatted.
        // TODO: add 'title' timestamp to the column and assert on it?
      });
    });

    describe('Table Pagination', async () => {
      before(async () => {
        /**
         * We need more than 10 rows to test pagination, and we currently have 1
         * unfortunately, this is what takes most of the time in all of the tests
         *
         * TODO: find a way to speed this up.
         */
        await Promise.all(Array.from({ length: 10 }, () => installKSPM(id())));
      });

      it('set page size', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();

        await cloudPosture.benchmarks.assertIntegrationCountExists(10, 11);
        await cloudPosture.benchmarks.setPageSize(25);
        await cloudPosture.benchmarks.assertIntegrationCountExists(11, 11);
      });

      it('move to next and previous pages', async () => {
        await cloudPosture.benchmarks.setPageSize(10);
        await cloudPosture.benchmarks.goToNextPage();
        await cloudPosture.benchmarks.assertIntegrationCountExists(1, 11);
        await cloudPosture.benchmarks.goToPreviousPage();
        await cloudPosture.benchmarks.assertIntegrationCountExists(10, 11);
      });
    });

    describe('Table Sort', async () => {
      it('sort by integration name', async () => {
        await cloudPosture.benchmarks.goToBenchmarkPage();
        await cloudPosture.benchmarks.assertIntegrationNameRowNumber(0, 'csp-00');
        await cloudPosture.benchmarks.assertIntegrationNameRowNumber(9, 'csp-09');
        await cloudPosture.benchmarks.toggleSortByName();
        await cloudPosture.benchmarks.assertIntegrationNameRowNumber(0, 'csp-10');
        await cloudPosture.benchmarks.assertIntegrationNameRowNumber(9, 'csp-01');
      });
    });

    describe('Search', () => {
      it('displays all results', async () => {
        await cloudPosture.benchmarks.filterBenchmarks('');
        await cloudPosture.benchmarks.assertIntegrationCountExists(10, 11);
      });

      it('displays filters results', async () => {
        await cloudPosture.benchmarks.filterBenchmarks('csp-02');
        await cloudPosture.benchmarks.assertIntegrationCountExists(1, 1);
      });
    });
  });
}
