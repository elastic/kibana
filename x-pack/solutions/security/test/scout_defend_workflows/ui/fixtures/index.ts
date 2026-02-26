/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest } from '@kbn/scout-security';
import type {
  KbnClient,
  ScoutLogger,
  EsClient,
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
} from '@kbn/scout-security';
import { indexHostsAndAlerts } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import type { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { deleteIndexedEndpointHosts } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_endpoint_hosts';
import {
  METADATA_DATASTREAM,
  POLICY_RESPONSE_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_EVENTS_INDEX,
  ENDPOINT_DEVICE_INDEX,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/constants';
import {
  indexFleetEndpointPolicy,
  deleteIndexedFleetEndpointPolicies,
} from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { IndexedFleetEndpointPolicyResponse } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createAndEnrollEndpointHost,
  destroyEndpointHost,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/endpoint_host_services';
import type { CreateAndEnrollEndpointHostResponse } from '@kbn/security-solution-plugin/scripts/endpoint/common/endpoint_host_services';
import { getOrCreateDefaultAgentPolicy } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { extendDWPageObjects } from './page_objects';
import type { DefendWorkflowsPageObjects } from './page_objects';

export { DEFEND_WORKFLOWS_ROUTES, DEFEND_WORKFLOWS_PAGE_SUBJS } from './constants';

export interface EndpointDataFixture {
  indexedData: IndexedHostsAndAlertsResponse;
  hostIds: string[];
  agentIds: string[];
}

export interface EndpointPolicyFixture {
  policyData: IndexedFleetEndpointPolicyResponse;
  agentPolicyId: string;
  integrationPolicyId: string;
}

export interface EndpointHostFixture {
  host: CreateAndEnrollEndpointHostResponse;
  agentPolicyId: string;
}

export interface DWParallelTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: DefendWorkflowsPageObjects;
}

export interface DWParallelWorkerFixtures extends SecurityParallelWorkerFixtures {
  endpointData: EndpointDataFixture;
  endpointPolicy: EndpointPolicyFixture;
  endpointHost: EndpointHostFixture;
}

const DW_BASE_AGENT_POLICY_NAME = 'DW Scout Base Policy';

export const spaceTest = baseSpaceTest.extend<DWParallelTestFixtures, DWParallelWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: DWParallelTestFixtures['pageObjects'];
      page: DWParallelTestFixtures['page'];
    },
    use: (po: DWParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use(extendDWPageObjects(pageObjects, page));
  },

  endpointData: [
    async (
      {
        kbnClient,
        esClient,
        log,
      }: {
        kbnClient: KbnClient;
        esClient: EsClient;
        log: ScoutLogger;
      },
      use: (data: EndpointDataFixture) => Promise<void>
    ) => {
      log.info('[DW fixture] Indexing mocked endpoint hosts...');

      const indexedData = await indexHostsAndAlerts(
        esClient,
        kbnClient,
        `scout.worker.${Date.now()}`,
        3,
        1,
        METADATA_DATASTREAM,
        POLICY_RESPONSE_INDEX,
        ENDPOINT_EVENTS_INDEX,
        ENDPOINT_ALERTS_INDEX,
        ENDPOINT_DEVICE_INDEX,
        1,
        true,
        {},
        undefined,
        true,
        1,
        undefined,
        false,
        log
      );

      const hostIds = indexedData.hosts.map((h) => h.agent.id);
      const agentIds = indexedData.agents
        .map((a) => a.agent?.id)
        .filter((id): id is string => !!id);

      log.info(`[DW fixture] Indexed ${hostIds.length} mocked endpoint hosts`);

      await use({ indexedData, hostIds, agentIds });

      log.info('[DW fixture] Cleaning up mocked endpoint data...');
      await deleteIndexedEndpointHosts(esClient, kbnClient, indexedData);
      log.info('[DW fixture] Mocked endpoint data cleaned up');
    },
    { scope: 'worker' },
  ],

  endpointPolicy: [
    async (
      {
        kbnClient,
        log,
      }: {
        kbnClient: KbnClient;
        log: ScoutLogger;
      },
      use: (data: EndpointPolicyFixture) => Promise<void>
    ) => {
      log.info('[DW fixture] Creating endpoint integration policy...');

      const policyData = await indexFleetEndpointPolicy(kbnClient, `DW Scout Policy ${Date.now()}`);

      const agentPolicyId = policyData.agentPolicies[0].id;
      const integrationPolicyId = policyData.integrationPolicies[0].id;

      log.info(
        `[DW fixture] Created policy: agentPolicy=${agentPolicyId}, integration=${integrationPolicyId}`
      );

      await use({ policyData, agentPolicyId, integrationPolicyId });

      log.info('[DW fixture] Cleaning up endpoint policies...');
      await deleteIndexedFleetEndpointPolicies(kbnClient, policyData);
      log.info('[DW fixture] Endpoint policies cleaned up');
    },
    { scope: 'worker' },
  ],

  endpointHost: [
    async (
      {
        kbnClient,
        log,
      }: {
        kbnClient: KbnClient;
        log: ScoutLogger;
      },
      use: (data: EndpointHostFixture) => Promise<void>
    ) => {
      log.info('[DW fixture] Creating real endpoint host...');

      const agentPolicy = await getOrCreateDefaultAgentPolicy({
        kbnClient,
        log,
        policyName: DW_BASE_AGENT_POLICY_NAME,
      });

      const host = await createAndEnrollEndpointHost({
        kbnClient,
        log,
        agentPolicyId: agentPolicy.id,
      });

      log.info(
        `[DW fixture] Real endpoint host created: hostname=${host.hostname}, agentId=${host.agentId}`
      );

      await use({ host, agentPolicyId: agentPolicy.id });

      log.info('[DW fixture] Destroying real endpoint host...');
      await destroyEndpointHost(kbnClient, host);
      log.info('[DW fixture] Real endpoint host destroyed');
    },
    { scope: 'worker' },
  ],
});
