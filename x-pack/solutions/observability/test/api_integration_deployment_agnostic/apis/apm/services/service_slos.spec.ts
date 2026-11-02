/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { CreateSLOInput } from '@kbn/slo-schema';
import { SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
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
    environment: string = 'production',
    groupBy: CreateSLOInput['groupBy'] = '*'
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
      groupBy,
    };
  }

  // `sloApi.create` only returns `{ id }`, so summary instance docs must be built
  // with concrete metadata (notably `slo.indicator.type`, which the SLO find and
  // grouped-stats queries filter on) rather than reading fields off the create response.
  const APM_SUMMARY_INDICATOR = {
    type: 'sli.apm.transactionDuration',
    params: {
      service: '*',
      environment: 'production',
      transactionType: 'request',
      transactionName: '',
      threshold: 500,
      index: 'metrics-apm*',
    },
  };

  function createGroupedApmSummaryDoc({
    sloId,
    instanceServiceName,
    name,
    now,
  }: {
    sloId: string;
    instanceServiceName: string;
    name: string;
    now: string;
  }) {
    return {
      slo: {
        id: sloId,
        instanceId: instanceServiceName,
        revision: 1,
        name,
        description: 'Test APM SLO',
        indicator: APM_SUMMARY_INDICATOR,
        timeWindow: { duration: '7d', type: 'rolling' },
        budgetingMethod: 'occurrences',
        objective: { target: 0.99 },
        tags: ['test'],
        groupBy: ['service.name'],
        groupings: { 'service.name': instanceServiceName },
      },
      service: { name: null, environment: null },
      transaction: { name: null, type: null },
      monitor: { config_id: null, name: null },
      observer: { geo: { name: null }, name: null },
      goodEvents: 100,
      totalEvents: 100,
      sliValue: 1,
      errorBudgetInitial: 0.01,
      errorBudgetConsumed: 0,
      errorBudgetRemaining: 1,
      errorBudgetEstimated: false,
      statusCode: 1,
      status: 'HEALTHY',
      isTempDoc: false,
      spaceId: 'default',
      summaryUpdatedAt: now,
      latestSliTimestamp: now,
      fiveMinuteBurnRate: { totalEvents: 0, goodEvents: 0, value: 0 },
      oneHourBurnRate: { totalEvents: 0, goodEvents: 0, value: 0 },
      oneDayBurnRate: { totalEvents: 0, goodEvents: 0, value: 0 },
    };
  }

  async function getServiceSlos({
    serviceName: service,
    environment = 'ENVIRONMENT_ALL',
    page = 0,
    perPage = 10,
    statusFilters,
    kqlQuery,
  }: {
    serviceName: string;
    environment?: string;
    page?: number;
    perPage?: number;
    statusFilters?: string[];
    kqlQuery?: string;
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
          ...(kqlQuery && { kqlQuery }),
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

    it('accepts kqlQuery parameter', async () => {
      const response = await getServiceSlos({
        serviceName,
        kqlQuery: 'slo.name : "non-existent"',
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

    it('includes SLOs created with wildcard (*) environment when filtering by a specific environment', async () => {
      const prodSlo = await sloApi.create(
        createApmSloInput('Prod SLO', serviceName, 'production'),
        adminRoleAuthc
      );
      const wildcardSlo = await sloApi.create(
        createApmSloInput('All Envs SLO', serviceName, '*'),
        adminRoleAuthc
      );
      const stagingSlo = await sloApi.create(
        createApmSloInput('Staging SLO', serviceName, 'staging'),
        adminRoleAuthc
      );

      const prodResponse = await getServiceSlos({ serviceName, environment: 'production' });

      expect(prodResponse.status).to.be(200);
      expect(prodResponse.body.results.length).to.be(2);
      expect(prodResponse.body.total).to.be(2);

      const foundProdSlo = prodResponse.body.results.find(
        (slo: { id: string }) => slo.id === prodSlo.id
      );
      expect(foundProdSlo).to.be.ok();

      const foundWildcardSlo = prodResponse.body.results.find(
        (slo: { id: string }) => slo.id === wildcardSlo.id
      );
      expect(foundWildcardSlo).to.be.ok();

      const foundStagingSlo = prodResponse.body.results.find(
        (slo: { id: string }) => slo.id === stagingSlo.id
      );
      expect(foundStagingSlo).to.be(undefined);

      await sloApi.delete(prodSlo.id, adminRoleAuthc);
      await sloApi.delete(wildcardSlo.id, adminRoleAuthc);
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

    it('returns grouped-by-service.name SLO instances for the matching service', async () => {
      const es = getService('es');
      const groupedServiceA = 'grouped-service-a';
      const groupedServiceB = 'grouped-service-b';
      const now = new Date().toISOString();

      const createdSlo = await sloApi.create(
        createApmSloInput('Grouped APM SLO', '*', 'production', ['service.name']),
        adminRoleAuthc
      );

      await es.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
          createGroupedApmSummaryDoc({
            sloId: createdSlo.id,
            instanceServiceName: groupedServiceA,
            name: 'Grouped APM SLO',
            now,
          }),
          { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
          createGroupedApmSummaryDoc({
            sloId: createdSlo.id,
            instanceServiceName: groupedServiceB,
            name: 'Grouped APM SLO',
            now,
          }),
        ],
      });

      const serviceAResponse = await getServiceSlos({ serviceName: groupedServiceA });
      const serviceBResponse = await getServiceSlos({ serviceName: groupedServiceB });

      expect(serviceAResponse.status).to.be(200);
      expect(serviceAResponse.body.results.length).to.be(1);
      expect(serviceAResponse.body.results[0].id).to.be(createdSlo.id);
      expect(serviceAResponse.body.results[0].instanceId).to.be(groupedServiceA);
      expect(serviceAResponse.body.statusCounts.healthy).to.be(1);

      expect(serviceBResponse.status).to.be(200);
      expect(serviceBResponse.body.results.length).to.be(1);
      expect(serviceBResponse.body.results[0].id).to.be(createdSlo.id);
      expect(serviceBResponse.body.results[0].instanceId).to.be(groupedServiceB);
      expect(serviceBResponse.body.statusCounts.healthy).to.be(1);

      await sloApi.delete(createdSlo.id, adminRoleAuthc);
    });

    it('returns both an ungrouped exact-service SLO and a grouped-by-service.name instance for the same service', async () => {
      const es = getService('es');
      const sharedServiceName = 'shared-service-both';
      const now = new Date().toISOString();

      // Ungrouped SLO pinned to the exact service (groupBy '*').
      const ungroupedSlo = await sloApi.create(
        createApmSloInput('Ungrouped exact-service SLO', sharedServiceName),
        adminRoleAuthc
      );

      // Grouped-by-service.name SLO (service '*') with a summary instance for the same service.
      const groupedSlo = await sloApi.create(
        createApmSloInput('Grouped APM SLO shared', '*', 'production', ['service.name']),
        adminRoleAuthc
      );

      await es.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
          createGroupedApmSummaryDoc({
            sloId: groupedSlo.id,
            instanceServiceName: sharedServiceName,
            name: 'Grouped APM SLO shared',
            now,
          }),
        ],
      });

      const response = await getServiceSlos({ serviceName: sharedServiceName });

      expect(response.status).to.be(200);
      const returnedIds = response.body.results.map((slo: { id: string }) => slo.id);
      expect(returnedIds).to.contain(ungroupedSlo.id);
      expect(returnedIds).to.contain(groupedSlo.id);

      await sloApi.delete(ungroupedSlo.id, adminRoleAuthc);
      await sloApi.delete(groupedSlo.id, adminRoleAuthc);
    });
  });
}
