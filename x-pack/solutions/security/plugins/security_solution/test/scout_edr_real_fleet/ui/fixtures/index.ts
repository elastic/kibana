/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test as baseTest } from '@kbn/scout-security';
import type {
  EsClient,
  KbnClient,
  ScoutLogger,
  ScoutPage,
  SecurityPageObjects,
  SecurityTestFixtures,
  SecurityWorkerFixtures,
} from '@kbn/scout-security';
import { setupFleetForEndpoint } from '../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { deleteAllEndpointData } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';
import {
  createAndEnrollEndpointHost,
  destroyEndpointHost,
  type CreateAndEnrollEndpointHostResponse,
} from '../../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointToStreamData } from '../../../../scripts/endpoint/common/endpoint_metadata_services';
import { startFleetServerIfNecessary } from '../../../../scripts/endpoint/common/fleet_server/fleet_server_services';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createEndpointPolicy,
  deleteEndpointPolicy,
  enableAllPolicyProtections,
  getCreatedPackagePolicy,
} from './endpoint_policy';
import type { EdrRealFleetPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export { tags };

const FLEET_AND_HOST_TIMEOUT_MS = 600_000;
const ENDPOINT_STREAM_TIMEOUT_MS = 180_000;

export interface EnrolledEndpoint {
  agentId: string;
  hostname: string;
}

export interface EdrRealFleetTestFixtures extends SecurityTestFixtures {
  pageObjects: EdrRealFleetPageObjects;
}

export interface EdrRealFleetWorkerFixtures extends SecurityWorkerFixtures {
  enrolledEndpoint: EnrolledEndpoint;
}

export const test = baseTest.extend<EdrRealFleetTestFixtures, EdrRealFleetWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: EdrRealFleetPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },

  enrolledEndpoint: [
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
      use: (endpoint: EnrolledEndpoint) => Promise<void>
    ) => {
      const created: {
        fleetServer?: Awaited<ReturnType<typeof startFleetServerIfNecessary>>;
        indexedPolicy?: IndexedFleetEndpointPolicyResponse;
        host?: CreateAndEnrollEndpointHostResponse;
      } = {};

      try {
        log.info('[edr_real_fleet] installing Fleet + Endpoint package');
        await setupFleetForEndpoint(kbnClient, log);

        log.info('[edr_real_fleet] starting Fleet Server if needed');
        created.fleetServer = await startFleetServerIfNecessary({
          kbnClient,
          logger: log,
        });

        created.indexedPolicy = await createEndpointPolicy(
          kbnClient,
          log,
          `automated-response-actions-${Date.now()}`
        );
        const policy = getCreatedPackagePolicy(created.indexedPolicy);
        await enableAllPolicyProtections(kbnClient, policy.id);

        const agentPolicyId = policy.policy_ids[0];
        if (!agentPolicyId) {
          throw new Error('Endpoint package policy has no agent policy id');
        }

        log.info(
          `[edr_real_fleet] creating and enrolling Endpoint host on policy ${agentPolicyId}`
        );
        created.host = await createAndEnrollEndpointHost({
          kbnClient,
          log,
          agentPolicyId,
        });

        log.info(`[edr_real_fleet] waiting for agent ${created.host.agentId} to stream data`);
        await waitForEndpointToStreamData(
          kbnClient,
          created.host.agentId,
          ENDPOINT_STREAM_TIMEOUT_MS
        );

        await use({
          agentId: created.host.agentId,
          hostname: created.host.hostname,
        });
      } finally {
        if (created.host) {
          await destroyEndpointHost(kbnClient, created.host).catch((error) => {
            log.warning(`[edr_real_fleet] destroyEndpointHost failed: ${error}`);
          });
          await deleteAllEndpointData(esClient, log, [created.host.agentId]).catch((error) => {
            log.warning(`[edr_real_fleet] deleteAllEndpointData failed: ${error}`);
          });
        }

        if (created.indexedPolicy) {
          await deleteEndpointPolicy(kbnClient, created.indexedPolicy).catch((error) => {
            log.warning(`[edr_real_fleet] deleteEndpointPolicy failed: ${error}`);
          });
        }

        if (created.fleetServer) {
          await created.fleetServer.stop().catch((error) => {
            log.warning(`[edr_real_fleet] fleet server stop failed: ${error}`);
          });
        }
      }
    },
    { scope: 'worker', timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],
});
