/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { fetchActiveSpace } from './spaces';
import { isServerlessKibanaFlavor } from '../../../common/endpoint/utils/kibana_status';
import { fetchFleetLatestAvailableAgentVersion } from '../../../common/endpoint/utils/fetch_fleet_version';
import { prefixedOutputLogger } from './utils';
import type { HostVm } from './types';
import type { BaseVmCreateOptions } from './vm_services';
import { createVm, getHostVmClient } from './vm_services';
import { downloadAndStoreAgent } from './agent_downloads_service';
import { enrollHostVmWithFleet, getAgentDownloadUrl, unEnrollFleetAgent } from './fleet_services';

export interface CreateAndEnrollEndpointHostOptions
  extends Pick<BaseVmCreateOptions, 'disk' | 'cpus' | 'memory'> {
  kbnClient: KbnClient;
  log: ToolingLog;
  /** The fleet Agent Policy ID to use for enrolling the agent */
  agentPolicyId: string;
  /** version of the Agent to install. Defaults to stack version */
  version?: string;
  /** skip all checks and use provided version */
  forceVersion?: boolean;
  /** The name for the host. Will also be the name of the VM */
  hostname?: string;
  /** If `version` should be exact, or if this is `true`, then the closest version will be used. Defaults to `false` */
  useClosestVersionMatch?: boolean;
  /** If the local cache of agent downloads should be used. Defaults to `true` */
  useCache?: boolean;
}

export interface CreateAndEnrollEndpointHostResponse {
  hostname: string;
  agentId: string;
  hostVm: HostVm;
}

/**
 * Creates a new virtual machine (host) and enrolls that with Fleet
 */
/**
 * Temporary pin for the Elastic Agent version used by real-endpoint tests (Cypress + CLI runner).
 *
 * The stack (`9.5.0-SNAPSHOT`) Elastic Defend build fails to load the Linux `production-ransomware-v1`
 * global artifact shipped in the current daily manifest (`ransom-protect` v0.0.3), and treats that
 * single bad artifact as fatal to the entire global manifest — leaving the endpoint with no
 * protections configured and the agent permanently `DEGRADED`, so policy status never reaches
 * "Success". `9.4.3` tolerates the same bad artifact (applies the rest), so it enrolls healthy.
 *
 * Remove this pin (let the version fall back to the stack version) once the upstream ransomware
 * artifact is fixed/rolled back. See https://github.com/elastic/kibana/issues/218441
 */
export const PINNED_AGENT_VERSION = '9.4.3';

export const createAndEnrollEndpointHost = async ({
  kbnClient,
  log: _log,
  agentPolicyId,
  cpus,
  disk,
  memory,
  hostname,
  version = kibanaPackageJson.version,
  forceVersion = false,
  useClosestVersionMatch = false,
  useCache = true,
}: CreateAndEnrollEndpointHostOptions): Promise<CreateAndEnrollEndpointHostResponse> => {
  const log = prefixedOutputLogger('createAndEnrollEndpointHost()', _log);
  let agentVersion = version;

  if (!forceVersion) {
    const isServerless = await isServerlessKibanaFlavor(kbnClient);
    if (isServerless) {
      agentVersion = await fetchFleetLatestAvailableAgentVersion(kbnClient);
    } else {
      // Temporary: pin the stateful/ESS agent to a version unaffected by the broken Linux
      // ransomware global artifact (see PINNED_AGENT_VERSION). Remove once fixed upstream.
      agentVersion = PINNED_AGENT_VERSION;
    }
  }
  const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;
  const isRunningInCI = Boolean(process.env.CI);
  const vmName =
    hostname ?? `test-host-${activeSpaceId}-${Math.random().toString().substring(2, 6)}`;
  const { url: agentUrl } = await getAgentDownloadUrl(agentVersion, useClosestVersionMatch, log);
  const agentDownload = isRunningInCI ? await downloadAndStoreAgent(agentUrl) : undefined;

  // TODO: remove dependency on env. var and keep function pure
  const hostVm = process.env.CI
    ? await createVm({
        type: 'vagrant',
        name: vmName,
        log,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        agentDownload: agentDownload!,
        disk,
        cpus,
        memory,
      })
    : await createVm({
        type: 'multipass',
        log,
        name: vmName,
        disk,
        cpus,
        memory,
      });

  const { id: agentId } = await enrollHostVmWithFleet({
    kbnClient,
    log,
    hostVm,
    agentPolicyId,
    version: agentVersion,
    closestVersionMatch: useClosestVersionMatch,
    useAgentCache: useCache,
  });

  return {
    hostname: hostVm.name,
    agentId,
    hostVm,
  };
};

/**
 * Destroys the Endpoint Host VM and un-enrolls the Fleet agent
 * @param kbnClient
 * @param createdHost
 */
export const destroyEndpointHost = async (
  kbnClient: KbnClient,
  createdHost: Pick<CreateAndEnrollEndpointHostResponse, 'hostname' | 'agentId'>
): Promise<void> => {
  await Promise.all([
    deleteMultipassVm(createdHost.hostname),
    unEnrollFleetAgent(kbnClient, createdHost.agentId, true),
  ]);
};

export const deleteMultipassVm = async (vmName: string): Promise<void> => {
  await getHostVmClient(vmName).destroy();
};

export async function stopEndpointHost(hostName: string): Promise<void> {
  await getHostVmClient(hostName).stop();
}

export async function startEndpointHost(hostName: string): Promise<void> {
  await getHostVmClient(hostName).start();
}
