/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-security';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import type { IndexedFleetEndpointPolicyResponse } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createAndEnrollEndpointHost,
  deleteMultipassVm,
  destroyEndpointHost,
  type CreateAndEnrollEndpointHostResponse,
} from '../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointToStreamData } from '../../../scripts/endpoint/common/endpoint_metadata_services';
import { startFleetServerIfNecessary } from '../../../scripts/endpoint/common/fleet_server/fleet_server_services';
import {
  deleteEndpointDataAndTestSuperuser,
  hasExistingFleetServerPolicy,
  stopAndDeleteFleetServer,
} from '../ui/fixtures/cleanup';
import {
  createEndpointPolicy,
  deleteEndpointPolicy,
  enableAllPolicyProtections,
  getCreatedPackagePolicy,
} from '../ui/fixtures/endpoint_policy';

export const FLEET_AND_HOST_TIMEOUT_MS = 600_000;
const ENDPOINT_STREAM_TIMEOUT_MS = 180_000;

export interface EnrolledEndpoint {
  agentId: string;
  hostname: string;
}

export interface EnrollEndpointHostOptions {
  kbnClient: KbnClient;
  esClient: EsClient;
  log: ScoutLogger;
  /** Prefix for the agent policy name. A timestamp is appended. */
  policyNamePrefix: string;
  /** Prefix for the VM hostname. A timestamp and random suffix are appended. */
  hostnamePrefix: string;
}

/**
 * Installs Fleet and Endpoint, enrolls one live host, then destroys that host and policy.
 */
export const enrollEndpointHost = async (
  { kbnClient, esClient, log, policyNamePrefix, hostnamePrefix }: EnrollEndpointHostOptions,
  use: (endpoint: EnrolledEndpoint) => Promise<void>
): Promise<void> => {
  const created: {
    fleetServer?: Awaited<ReturnType<typeof startFleetServerIfNecessary>>;
    deleteFleetServerPolicy?: boolean;
    indexedPolicy?: IndexedFleetEndpointPolicyResponse;
    host?: CreateAndEnrollEndpointHostResponse;
  } = {};

  try {
    log.info('[edr_real_fleet] installing Fleet + Endpoint package');
    await setupFleetForEndpoint(kbnClient, log);

    log.info('[edr_real_fleet] starting Fleet Server if needed');
    const hadFleetServerPolicy = await hasExistingFleetServerPolicy(kbnClient).catch((error) => {
      log.warning(`[edr_real_fleet] Fleet Server policy lookup failed: ${error}`);
      return true;
    });
    created.fleetServer = await startFleetServerIfNecessary({
      kbnClient,
      logger: log,
    });
    created.deleteFleetServerPolicy = Boolean(created.fleetServer) && !hadFleetServerPolicy;

    created.indexedPolicy = await createEndpointPolicy(
      kbnClient,
      log,
      `${policyNamePrefix}-${Date.now()}`
    );
    const policy = getCreatedPackagePolicy(created.indexedPolicy);
    await enableAllPolicyProtections(kbnClient, policy.id);

    const agentPolicyId = policy.policy_ids[0];
    if (!agentPolicyId) {
      throw new Error('Endpoint package policy has no agent policy id');
    }

    const destroyHost = async (hostToDestroy: CreateAndEnrollEndpointHostResponse) => {
      await destroyEndpointHost(kbnClient, hostToDestroy).catch((destroyError) => {
        log.warning(`[edr_real_fleet] destroyEndpointHost failed: ${destroyError}`);
      });
      await deleteEndpointDataAndTestSuperuser(esClient, log, [hostToDestroy.agentId]).catch(
        (deleteError) => {
          log.warning(`[edr_real_fleet] deleteEndpointDataAndTestSuperuser failed: ${deleteError}`);
        }
      );
    };

    const nextHostname = (): string =>
      `${hostnamePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const enrollHost = async (hostname: string): Promise<CreateAndEnrollEndpointHostResponse> => {
      log.info(
        `[edr_real_fleet] creating and enrolling Endpoint host ${hostname} on policy ${agentPolicyId}`
      );
      const enrolled = await createAndEnrollEndpointHost({
        kbnClient,
        log,
        agentPolicyId,
        hostname,
        useClosestVersionMatch: true,
      });

      try {
        log.info(`[edr_real_fleet] waiting for agent ${enrolled.agentId} to stream data`);
        await waitForEndpointToStreamData(kbnClient, enrolled.agentId, ENDPOINT_STREAM_TIMEOUT_MS);
        return enrolled;
      } catch (streamError) {
        await destroyHost(enrolled);
        throw streamError;
      }
    };

    const enrollOrDestroyVm = async (
      hostname: string
    ): Promise<CreateAndEnrollEndpointHostResponse> => {
      try {
        return await enrollHost(hostname);
      } catch (enrollError) {
        await deleteMultipassVm(hostname).catch((destroyError) => {
          log.warning(
            `[edr_real_fleet] destroy VM ${hostname} after failed enroll failed: ${destroyError}`
          );
        });
        throw enrollError;
      }
    };

    const firstHostname = nextHostname();
    let host: CreateAndEnrollEndpointHostResponse;
    try {
      host = await enrollOrDestroyVm(firstHostname);
    } catch (error) {
      log.warning(`[edr_real_fleet] host setup failed, retrying once: ${error}`);
      host = await enrollOrDestroyVm(nextHostname());
    }

    created.host = host;

    await use({
      agentId: host.agentId,
      hostname: host.hostname,
    });
  } finally {
    if (created.host) {
      await destroyEndpointHost(kbnClient, created.host).catch((error) => {
        log.warning(`[edr_real_fleet] destroyEndpointHost failed: ${error}`);
      });
      await deleteEndpointDataAndTestSuperuser(esClient, log, [created.host.agentId]).catch(
        (error) => {
          log.warning(`[edr_real_fleet] deleteEndpointDataAndTestSuperuser failed: ${error}`);
        }
      );
    }

    if (created.indexedPolicy) {
      await deleteEndpointPolicy(kbnClient, created.indexedPolicy).catch((error) => {
        log.warning(`[edr_real_fleet] deleteEndpointPolicy failed: ${error}`);
      });
    }

    if (created.fleetServer) {
      await stopAndDeleteFleetServer(kbnClient, log, created.fleetServer, {
        deletePolicy: Boolean(created.deleteFleetServerPolicy),
      }).catch((error) => {
        log.warning(`[edr_real_fleet] stopAndDeleteFleetServer failed: ${error}`);
      });
    }
  }
};
