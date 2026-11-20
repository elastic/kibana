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
} from '../shared_host/ui/fixtures/cleanup';
import {
  createEndpointPolicy,
  deleteEndpointPolicy,
  enableAllPolicyProtections,
  getCreatedPackagePolicy,
} from '../shared_host/ui/fixtures/endpoint_policy';

const ENDPOINT_STREAM_TIMEOUT_MS = 180_000;

export const FLEET_AND_HOST_TIMEOUT_MS = 600_000;

export interface EnrolledEndpoint {
  agentId: string;
  hostname: string;
  packagePolicyId: string;
}

export interface EnrolledHost {
  agentId: string;
  hostname: string;
}

/**
 * Installs Fleet and the Endpoint package and starts Fleet Server when needed.
 * Teardown stops Fleet Server and deletes its policy only when this call created it.
 */
export const withFleetServerForEndpoint = async (
  { kbnClient, log }: { kbnClient: KbnClient; log: ScoutLogger },
  use: () => Promise<void>
): Promise<void> => {
  let fleetServer: Awaited<ReturnType<typeof startFleetServerIfNecessary>> | undefined;
  let deleteFleetServerPolicy = false;

  try {
    log.info('[edr_real_fleet] installing Fleet + Endpoint package');
    await setupFleetForEndpoint(kbnClient, log);

    log.info('[edr_real_fleet] starting Fleet Server if needed');
    const hadFleetServerPolicy = await hasExistingFleetServerPolicy(kbnClient).catch((error) => {
      log.warning(`[edr_real_fleet] Fleet Server policy lookup failed: ${error}`);
      return true;
    });
    fleetServer = await startFleetServerIfNecessary({
      kbnClient,
      logger: log,
    });
    deleteFleetServerPolicy = Boolean(fleetServer) && !hadFleetServerPolicy;

    await use();
  } finally {
    if (fleetServer) {
      await stopAndDeleteFleetServer(kbnClient, log, fleetServer, {
        deletePolicy: deleteFleetServerPolicy,
      }).catch((error) => {
        log.warning(`[edr_real_fleet] stopAndDeleteFleetServer failed: ${error}`);
      });
    }
  }
};

/**
 * Creates a VM, enrolls it on `agentPolicyId` and waits for Endpoint data, retrying
 * once on a new VM. Teardown destroys the host and deletes its Endpoint data.
 */
export const withEnrolledHost = async (
  {
    kbnClient,
    esClient,
    log,
    agentPolicyId,
    hostnamePrefix,
  }: {
    kbnClient: KbnClient;
    esClient: EsClient;
    log: ScoutLogger;
    agentPolicyId: string;
    hostnamePrefix: string;
  },
  use: (host: EnrolledHost) => Promise<void>
): Promise<void> => {
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
    `${hostnamePrefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

  let host: CreateAndEnrollEndpointHostResponse;
  try {
    host = await enrollOrDestroyVm(nextHostname());
  } catch (error) {
    log.warning(`[edr_real_fleet] host setup failed, retrying once: ${error}`);
    host = await enrollOrDestroyVm(nextHostname());
  }

  try {
    await use({ agentId: host.agentId, hostname: host.hostname });
  } finally {
    await destroyHost(host);
  }
};

/**
 * Starts Fleet Server when needed, creates one Endpoint policy, and enrolls a
 * live host. Shared by the real Fleet UI and API Playwright projects.
 */
export const withEnrolledEndpoint = async (
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
): Promise<void> => {
  await withFleetServerForEndpoint({ kbnClient, log }, async () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse | undefined;

    try {
      indexedPolicy = await createEndpointPolicy(
        kbnClient,
        log,
        `automated-response-actions-${Date.now()}`
      );
      const policy = getCreatedPackagePolicy(indexedPolicy);
      await enableAllPolicyProtections(kbnClient, policy.id);

      const agentPolicyId = policy.policy_ids[0];
      if (!agentPolicyId) {
        throw new Error('Endpoint package policy has no agent policy id');
      }

      await withEnrolledHost(
        { kbnClient, esClient, log, agentPolicyId, hostnamePrefix: 'test-host-ara-' },
        ({ agentId, hostname }) => use({ agentId, hostname, packagePolicyId: policy.id })
      );
    } finally {
      if (indexedPolicy) {
        await deleteEndpointPolicy(kbnClient, indexedPolicy).catch((error) => {
          log.warning(`[edr_real_fleet] deleteEndpointPolicy failed: ${error}`);
        });
      }
    }
  });
};
