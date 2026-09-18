/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutTestConfig } from '@kbn/scout-oblt';
import { tryForTime } from '../../../scout/common/fixtures/retry';
import type { ScoutPrivateLocation } from '../../../scout/common/services/synthetics_private_location_api_service';
import type { SyntheticsApiServicesFixture } from '../../../scout/common/fixtures';
import {
  containerLogs,
  dockerContainerName,
  isDockerAvailable,
  publishedHostPort,
  pullImage,
  removeContainer,
  startDetachedContainer,
} from './docker';
import { startTargetServer, stopTargetServer, type TargetServer } from './target_server';

const FLEET_SERVER_CONTAINER_PORT = 8220;
const DOCKER_HOST_GATEWAY = ['--add-host', 'host.docker.internal:host-gateway'];

export interface AgentStack {
  privateLocation: ScoutPrivateLocation;
  target: Omit<TargetServer, 'server'>;
  runId: string;
}

interface EnrollmentApiKeyItem {
  api_key: string;
  policy_id: string;
}

interface FleetAgentItem {
  id: string;
  status: string;
  policy_id: string;
}

const esPortFromUrl = (elasticsearchUrl: string): string => {
  const parsed = new URL(elasticsearchUrl);
  return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
};

async function waitForFleetServer(url: string, log: ScoutLogger): Promise<void> {
  await tryForTime(
    180_000,
    async () => {
      let response: Response;
      try {
        response = await fetch(`${url}/api/status`);
      } catch (error) {
        throw new Error(
          `Fleet Server not reachable at ${url}/api/status: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      const body = await response.text();
      if (!response.ok || (!body.includes('HEALTHY') && !body.includes('online'))) {
        throw new Error(`Fleet Server not healthy yet: HTTP ${response.status} ${body}`);
      }
    },
    { intervalMs: 3_000 }
  );
  log.info('Fleet Server is healthy');
}

async function waitForAgentOnline(
  kbnClient: KbnClient,
  log: ScoutLogger,
  policyId: string
): Promise<string> {
  let agentId = '';
  await tryForTime(
    180_000,
    async () => {
      const { data } = await kbnClient.request<{ items: FleetAgentItem[] }>({
        method: 'GET',
        path: '/api/fleet/agents',
        query: { kuery: `policy_id:"${policyId}"` },
      });
      const agent = data.items.find((item) => item.status === 'online');
      if (!agent) {
        throw new Error(
          `No online agent for policy ${policyId}. Seen: ${JSON.stringify(data.items)}`
        );
      }
      agentId = agent.id;
    },
    { intervalMs: 5_000 }
  );
  log.info(`Elastic Agent ${agentId} is online on policy ${policyId}`);
  return agentId;
}

export async function startAgentStack({
  apiServices,
  kbnClient,
  config,
  log,
  runId,
}: {
  apiServices: SyntheticsApiServicesFixture;
  kbnClient: KbnClient;
  config: ScoutTestConfig;
  log: ScoutLogger;
  runId: string;
}): Promise<{ stack: AgentStack; stop: () => Promise<void> }> {
  if (!isDockerAvailable()) {
    throw new Error(
      'Docker is required for scout_synthetics_agent_e2e (Fleet Server + elastic-agent-complete)'
    );
  }

  const fleetServerContainer = dockerContainerName('fleet-server', runId);
  const agentContainer = dockerContainerName('agent', runId);
  const target = await startTargetServer();
  log.info(`Target HTTP server listening on ${target.url}`);

  const version = await kbnClient.version.get();
  // Image tag follows the Kibana under test (8.19.x on an 8.19 backport, 9.6.0
  // on main). Source/dev Kibana often reports `build_snapshot: false` even when
  // ES is a SNAPSHOT — always pull the SNAPSHOT agent images for this suite.
  const imageTag = version.includes('-SNAPSHOT') ? version : `${version}-SNAPSHOT`;
  const fleetServerImage = `docker.elastic.co/elastic-agent/elastic-agent:${imageTag}`;
  const agentImage = `docker.elastic.co/elastic-agent/elastic-agent-complete:${imageTag}`;
  const esPort = esPortFromUrl(config.hosts.elasticsearch);
  const dockerEsHost = `http://host.docker.internal:${esPort}`;

  let fleetServerStarted = false;
  let agentStarted = false;
  let dockerOutputId: string | undefined;
  let dockerFleetHostId: string | undefined;
  let fleetServerPolicyId: string | undefined;
  let syntheticsPolicyId: string | undefined;
  let privateLocationId: string | undefined;
  let enrolledAgentId: string | undefined;

  const runCleanup = async (label: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
    } catch (error) {
      log.warning(
        `agent-e2e teardown ${label} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const stop = async () => {
    // Best-effort: one failed delete must not skip the rest (shared Scout server).
    await runCleanup('agent container', () => {
      if (agentStarted) {
        removeContainer(agentContainer);
      }
    });
    await runCleanup('fleet-server container', () => {
      if (fleetServerStarted) {
        removeContainer(fleetServerContainer);
      }
    });
    await runCleanup('target server', () => stopTargetServer(target.server));
    if (enrolledAgentId) {
      const agentId = enrolledAgentId;
      await runCleanup('enrolled agent', () => apiServices.fleet.agent.delete(agentId));
    }
    if (privateLocationId) {
      const locationId = privateLocationId;
      await runCleanup('private location', () =>
        apiServices.syntheticsPrivateLocations.deletePrivateLocation(locationId)
      );
    }
    if (syntheticsPolicyId) {
      const policyId = syntheticsPolicyId;
      await runCleanup('synthetics policy', () =>
        apiServices.fleet.agent_policies.delete(policyId, true)
      );
    }
    if (fleetServerPolicyId) {
      const policyId = fleetServerPolicyId;
      await runCleanup('fleet server policy', () =>
        apiServices.fleet.agent_policies.delete(policyId, true)
      );
    }
    if (dockerFleetHostId) {
      const hostId = dockerFleetHostId;
      await runCleanup('fleet host', () => apiServices.fleet.server_hosts.delete(hostId));
    }
    if (dockerOutputId) {
      const outputId = dockerOutputId;
      await runCleanup('es output', () => apiServices.fleet.outputs.delete(outputId));
    }
  };

  try {
    log.info(`Pulling ${fleetServerImage}`);
    pullImage(fleetServerImage);
    log.info(`Pulling ${agentImage}`);
    pullImage(agentImage);

    await apiServices.fleet.internal.setup();
    await apiServices.fleet.agent.setup();
    await apiServices.syntheticsPrivateLocations.installSyntheticsPackage();

    const { data: dockerOutput } = await apiServices.fleet.outputs.create(
      `scout-synthetics-agent-e2e-es-${runId}`,
      [dockerEsHost],
      'elasticsearch',
      { is_default: false, is_default_monitoring: false }
    );
    dockerOutputId = dockerOutput.item.id as string;

    const { data: serviceToken } = await kbnClient.request<{ value: string }>({
      method: 'POST',
      path: '/api/fleet/service_tokens',
    });

    const fleetServerPolicyName = `scout-synthetics-agent-e2e-fleet-server-${runId}`;
    const { data: fleetServerPolicy } = await apiServices.fleet.agent_policies.create({
      policyName: fleetServerPolicyName,
      policyNamespace: 'default',
      sysMonitoring: false,
      params: {
        description: 'Fleet Server policy for scout_synthetics_agent_e2e',
        monitoring_enabled: [],
        has_fleet_server: true,
        data_output_id: dockerOutputId,
      },
    });
    fleetServerPolicyId = fleetServerPolicy.item.id as string;

    log.info(`Starting Fleet Server ${fleetServerImage}`);
    startDetachedContainer(fleetServerContainer, [
      '-p',
      String(FLEET_SERVER_CONTAINER_PORT),
      ...DOCKER_HOST_GATEWAY,
      '-e',
      'FLEET_SERVER_ENABLE=true',
      '-e',
      'FLEET_SERVER_HOST=0.0.0.0',
      '-e',
      'FLEET_SERVER_INSECURE_HTTP=true',
      '-e',
      'FLEET_INSECURE=true',
      '-e',
      `FLEET_SERVER_ELASTICSEARCH_HOST=${dockerEsHost}`,
      '-e',
      `FLEET_SERVER_SERVICE_TOKEN=${serviceToken.value}`,
      '-e',
      `FLEET_SERVER_POLICY_ID=${fleetServerPolicyId}`,
      '-e',
      `FLEET_SERVER_POLICY=${fleetServerPolicyId}`,
      fleetServerImage,
    ]);
    fleetServerStarted = true;

    const fleetHostPort = publishedHostPort(fleetServerContainer, FLEET_SERVER_CONTAINER_PORT);
    const fleetServerUrl = `http://localhost:${fleetHostPort}`;
    const agentFleetUrl = `http://host.docker.internal:${fleetHostPort}`;

    try {
      await waitForFleetServer(fleetServerUrl, log);
    } catch (error) {
      log.error(`Fleet Server failed to become healthy:\n${containerLogs(fleetServerContainer)}`);
      throw error;
    }

    const { data: dockerFleetHost } = await apiServices.fleet.server_hosts.create(
      `scout-synthetics-agent-e2e-fleet-host-${runId}`,
      [agentFleetUrl],
      { is_default: false }
    );
    dockerFleetHostId = dockerFleetHost.item.id as string;

    await apiServices.fleet.agent_policies.update({
      agentPolicyId: fleetServerPolicyId,
      policyName: fleetServerPolicyName,
      policyNamespace: 'default',
      params: {
        has_fleet_server: true,
        data_output_id: dockerOutputId,
        fleet_server_host_id: dockerFleetHostId,
      },
    });

    const syntheticsPolicyName = `scout-synthetics-agent-e2e-${runId}`;
    const createdSyntheticsPolicyId = (
      await apiServices.syntheticsPrivateLocations.addFleetPolicy(syntheticsPolicyName)
    ).id;
    syntheticsPolicyId = createdSyntheticsPolicyId;
    await apiServices.fleet.agent_policies.update({
      agentPolicyId: createdSyntheticsPolicyId,
      policyName: syntheticsPolicyName,
      policyNamespace: 'default',
      params: {
        data_output_id: dockerOutputId,
        fleet_server_host_id: dockerFleetHostId,
      },
    });
    const [privateLocation] = await apiServices.syntheticsPrivateLocations.setTestLocations([
      createdSyntheticsPolicyId,
    ]);
    privateLocationId = privateLocation.id;

    const { data: enrollmentKeys } = await kbnClient.request<{ items: EnrollmentApiKeyItem[] }>({
      method: 'GET',
      path: '/api/fleet/enrollment_api_keys',
      query: { kuery: `policy_id:"${createdSyntheticsPolicyId}"` },
    });
    const enrollmentToken = enrollmentKeys.items[0]?.api_key;
    if (!enrollmentToken) {
      throw new Error(`No enrollment API key for synthetics policy ${createdSyntheticsPolicyId}`);
    }

    log.info(`Starting synthetics agent ${agentImage}`);
    // CI runc rejects `--sysctl net.ipv4.ping_group_range=...` (invalid argument).
    // NET_RAW is enough for ICMP; Docker Desktop already allows unprivileged ping.
    startDetachedContainer(agentContainer, [
      ...DOCKER_HOST_GATEWAY,
      '--cap-add=NET_RAW',
      '--cap-add=SYS_ADMIN',
      '--security-opt=seccomp=unconfined',
      '-e',
      'FLEET_ENROLL=1',
      '-e',
      `FLEET_URL=${agentFleetUrl}`,
      '-e',
      `FLEET_ENROLLMENT_TOKEN=${enrollmentToken}`,
      '-e',
      'FLEET_INSECURE=true',
      agentImage,
    ]);
    agentStarted = true;

    try {
      enrolledAgentId = await waitForAgentOnline(kbnClient, log, createdSyntheticsPolicyId);
    } catch (error) {
      log.error(`Agent failed to come online:\n${containerLogs(agentContainer)}`);
      throw error;
    }

    return {
      stack: {
        privateLocation,
        target: { port: target.port, url: target.url, host: target.host },
        runId,
      },
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
