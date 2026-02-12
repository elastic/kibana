/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ServiceSlos({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');

  const serviceName = 'my-test-service';

  let adminRoleAuthc: RoleCredentials;

  function createApmSloInput(
    name: string,
    service: string,
    environment: string = 'production'
  ): CreateSLOInput {
    return {
      name,
      description: 'Test APM SLO',
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: {
          service,
          environment,
          transactionType: 'request',
          transactionName: '',
          threshold: 500,
          index: 'metrics-apm*',
        },
      },
      budgetingMethod: 'occurrences',
      timeWindow: { duration: '7d', type: 'rolling' },
      objective: { target: 0.99 },
      tags: ['test'],
      groupBy: '*',
    };
  }

  async function getServiceSlos({
    serviceName: service,
    environment = 'ENVIRONMENT_ALL',
    page = 0,
    perPage = 10,
    statusFilters,
  }: {
    serviceName: string;
    environment?: string;
    page?: number;
    perPage?: number;
    statusFilters?: string[];
  }) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/slos',
      params: {
        path: { serviceName: service },
        query: {
          environment,
          page,
          perPage,
          ...(statusFilters && { statusFilters: JSON.stringify(statusFilters) }),
        },
      },
    });
  }

  describe('Service SLOs', () => {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('returns empty results when no SLOs exist for the service', async () => {
      const response = await getServiceSlos({ serviceName });

      expect(response.status).to.be(200);
      expect(response.body.results).to.eql([]);
      expect(response.body.total).to.be(0);
      expect(response.body.page).to.be(0);
      expect(response.body.perPage).to.be(10);
      expect(response.body.activeAlerts).to.eql({});
      expect(response.body.statusCounts).to.eql({
        violated: 0,
        degrading: 0,
        healthy: 0,
        noData: 0,
      });
    });

    it('accepts pagination parameters (0-indexed)', async () => {
      const response = await getServiceSlos({ serviceName, page: 0, perPage: 5 });

      expect(response.status).to.be(200);
      expect(response.body.page).to.be(0);
      expect(response.body.perPage).to.be(5);
    });

    it('accepts status filters as array', async () => {
      const response = await getServiceSlos({
        serviceName,
        statusFilters: ['VIOLATED', 'DEGRADING'],
      });

      expect(response.status).to.be(200);
      expect(response.body.results).to.eql([]);
    });

    it('creates SLO and returns it for the service', async () => {
      const createdSlo = await sloApi.create(
        createApmSloInput('Test APM SLO', serviceName),
        adminRoleAuthc
      );

      expect(createdSlo).to.have.property('id');

      const response = await getServiceSlos({ serviceName });

      expect(response.status).to.be(200);
      expect(response.body.results.length).to.be(1);
      expect(response.body.total).to.be(1);

      const foundSlo = response.body.results.find(
        (slo: { id: string }) => slo.id === createdSlo.id
      );
      expect(foundSlo).to.be.ok();
      expect(foundSlo?.id).to.be(createdSlo.id);

      await sloApi.delete(createdSlo.id, adminRoleAuthc);
    });

    it('does not return SLOs for other services', async () => {
      const otherServiceName = 'other-service-xyz';

      const createdSlo = await sloApi.create(
        createApmSloInput('Test APM SLO Other Service', otherServiceName),
        adminRoleAuthc
      );

      const response = await getServiceSlos({ serviceName });

      expect(response.status).to.be(200);
      expect(response.body.results.length).to.be(0);
      expect(response.body.total).to.be(0);

      const foundSlo = response.body.results.find(
        (slo: { id: string }) => slo.id === createdSlo.id
      );
      expect(foundSlo).to.be(undefined);

      await sloApi.delete(createdSlo.id, adminRoleAuthc);
    });

    it('filters by environment correctly', async () => {
      const prodSlo = await sloApi.create(
        createApmSloInput('Prod SLO', serviceName, 'production'),
        adminRoleAuthc
      );
      const stagingSlo = await sloApi.create(
        createApmSloInput('Staging SLO', serviceName, 'staging'),
        adminRoleAuthc
      );

      const prodResponse = await getServiceSlos({ serviceName, environment: 'production' });

      expect(prodResponse.status).to.be(200);
      expect(prodResponse.body.results.length).to.be(1);
      expect(prodResponse.body.total).to.be(1);

      const foundProdSlo = prodResponse.body.results.find(
        (slo: { id: string }) => slo.id === prodSlo.id
      );
      expect(foundProdSlo).to.be.ok();
      expect(foundProdSlo?.id).to.be(prodSlo.id);

      const foundStagingSlo = prodResponse.body.results.find(
        (slo: { id: string }) => slo.id === stagingSlo.id
      );
      expect(foundStagingSlo).to.be(undefined);

      await sloApi.delete(prodSlo.id, adminRoleAuthc);
      await sloApi.delete(stagingSlo.id, adminRoleAuthc);
    });

    it('returns status counts for the service', async () => {
      const createdSlo = await sloApi.create(
        createApmSloInput('Status Count Test SLO', serviceName),
        adminRoleAuthc
      );

      const response = await getServiceSlos({ serviceName });
      const { statusCounts } = response.body;

      expect(response.status).to.be(200);
      expect(statusCounts).to.have.keys(['violated', 'degrading', 'healthy', 'noData']);
      expect(statusCounts.noData).to.be(1);

      await sloApi.delete(createdSlo.id, adminRoleAuthc);
    });

    it('returns empty activeAlerts when no burn rate rules exist', async () => {
      const createdSlo = await sloApi.create(
        createApmSloInput('No Alerts Test SLO', serviceName),
        adminRoleAuthc
      );

      const response = await getServiceSlos({ serviceName });

      expect(response.status).to.be(200);

      const foundSlo = response.body.results.find(
        (slo: { id: string }) => slo.id === createdSlo.id
      );
      expect(foundSlo).to.be.ok();
      expect(response.body.activeAlerts).to.eql({});

      await sloApi.delete(createdSlo.id, adminRoleAuthc);
    });
  });
}
