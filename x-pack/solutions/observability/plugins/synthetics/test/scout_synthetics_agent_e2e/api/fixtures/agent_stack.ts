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
  FLEET_SERVER_CONTAINER,
  SYNTHETICS_AGENT_CONTAINER,
  containerLogs,
  isDockerAvailable,
  pullImage,
  removeContainer,
  startDetachedContainer,
} from './docker';
import { startTargetServer, stopTargetServer, type TargetServer } from './target_server';

const FLEET_SERVER_PORT = 8220;
const FLEET_SERVER_URL = `http://localhost:${FLEET_SERVER_PORT}`;
const AGENT_FLEET_URL = `http://host.docker.internal:${FLEET_SERVER_PORT}`;

const DOCKER_HOST_GATEWAY = ['--add-host', 'host.docker.internal:host-gateway'];

export interface AgentStack {
  privateLocation: ScoutPrivateLocation;
  target: Omit<TargetServer, 'server'>;
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

async function waitForFleetServer(log: ScoutLogger): Promise<void> {
  await tryForTime(
    180_000,
    async () => {
      let response: Response;
      try {
        response = await fetch(`${FLEET_SERVER_URL}/api/status`);
      } catch (error) {
        throw new Error(
          `Fleet Server not reachable at ${FLEET_SERVER_URL}/api/status: ${
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

async function advertiseDockerFleetServerHost(kbnClient: KbnClient): Promise<void> {
  const { data } = await kbnClient.request<{
    items: Array<{ id: string; is_default?: boolean; host_urls?: string[] }>;
  }>({
    method: 'GET',
    path: '/api/fleet/fleet_server_hosts',
  });
  const alreadyAdvertised = data.items.some((item) => item.host_urls?.includes(AGENT_FLEET_URL));
  if (alreadyAdvertised) {
    return;
  }
  // Preconfigured hosts cannot change `host_urls` via API — add a default
  // host the Docker agent can reach.
  await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/fleet_server_hosts',
    body: {
      name: 'Docker Fleet Server',
      host_urls: [AGENT_FLEET_URL],
      is_default: true,
    },
  });
}

async function waitForAgentOnline(
  kbnClient: KbnClient,
  log: ScoutLogger,
  policyId: string
): Promise<void> {
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
    },
    { intervalMs: 5_000 }
  );
  log.info(`Elastic Agent is online on policy ${policyId}`);
}

export async function startAgentStack({
  apiServices,
  kbnClient,
  config,
  log,
}: {
  apiServices: SyntheticsApiServicesFixture;
  kbnClient: KbnClient;
  config: ScoutTestConfig;
  log: ScoutLogger;
}): Promise<{ stack: AgentStack; stop: () => Promise<void> }> {
  if (!isDockerAvailable()) {
    throw new Error(
      'Docker is required for scout_synthetics_agent_e2e (Fleet Server + elastic-agent-complete)'
    );
  }

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

  let fleetServerStarted = false;
  let agentStarted = false;

  const stop = async () => {
    if (agentStarted) {
      removeContainer(SYNTHETICS_AGENT_CONTAINER);
    }
    if (fleetServerStarted) {
      removeContainer(FLEET_SERVER_CONTAINER);
    }
    await stopTargetServer(target.server);
    await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
  };

  try {
    log.info(`Pulling ${fleetServerImage}`);
    pullImage(fleetServerImage);
    log.info(`Pulling ${agentImage}`);
    pullImage(agentImage);

    await apiServices.fleet.internal.setup();
    await apiServices.fleet.agent.setup();
    await advertiseDockerFleetServerHost(kbnClient);
    await apiServices.syntheticsPrivateLocations.installSyntheticsPackage();

    const { data: serviceToken } = await kbnClient.request<{ value: string }>({
      method: 'POST',
      path: '/api/fleet/service_tokens',
    });

    const { data: fleetServerPolicy } = await apiServices.fleet.agent_policies.create({
      policyName: `scout-synthetics-agent-e2e-fleet-server-${Date.now()}`,
      policyNamespace: 'default',
      sysMonitoring: false,
      params: {
        description: 'Fleet Server policy for scout_synthetics_agent_e2e',
        monitoring_enabled: [],
        has_fleet_server: true,
      },
    });
    const fleetServerPolicyId = fleetServerPolicy.item.id as string;

    log.info(`Starting Fleet Server ${fleetServerImage}`);
    startDetachedContainer(FLEET_SERVER_CONTAINER, [
      '-p',
      `${FLEET_SERVER_PORT}:8220`,
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
      `FLEET_SERVER_ELASTICSEARCH_HOST=http://host.docker.internal:${esPort}`,
      '-e',
      `FLEET_SERVER_SERVICE_TOKEN=${serviceToken.value}`,
      '-e',
      `FLEET_SERVER_POLICY_ID=${fleetServerPolicyId}`,
      '-e',
      `FLEET_SERVER_POLICY=${fleetServerPolicyId}`,
      fleetServerImage,
    ]);
    fleetServerStarted = true;

    try {
      await waitForFleetServer(log);
    } catch (error) {
      log.error(`Fleet Server failed to become healthy:\n${containerLogs(FLEET_SERVER_CONTAINER)}`);
      throw error;
    }

    const { id: syntheticsPolicyId } = await apiServices.syntheticsPrivateLocations.addFleetPolicy(
      `scout-synthetics-agent-e2e-${Date.now()}`
    );
    const [privateLocation] = await apiServices.syntheticsPrivateLocations.setTestLocations([
      syntheticsPolicyId,
    ]);

    const { data: enrollmentKeys } = await kbnClient.request<{ items: EnrollmentApiKeyItem[] }>({
      method: 'GET',
      path: '/api/fleet/enrollment_api_keys',
      query: { kuery: `policy_id:"${syntheticsPolicyId}"` },
    });
    const enrollmentToken = enrollmentKeys.items[0]?.api_key;
    if (!enrollmentToken) {
      throw new Error(`No enrollment API key for synthetics policy ${syntheticsPolicyId}`);
    }

    log.info(`Starting synthetics agent ${agentImage}`);
    // CI runc rejects `--sysctl net.ipv4.ping_group_range=...` (invalid argument).
    // NET_RAW is enough for ICMP; Docker Desktop already allows unprivileged ping.
    startDetachedContainer(SYNTHETICS_AGENT_CONTAINER, [
      ...DOCKER_HOST_GATEWAY,
      '--cap-add=NET_RAW',
      '--cap-add=SYS_ADMIN',
      '--security-opt=seccomp=unconfined',
      '-e',
      'FLEET_ENROLL=1',
      '-e',
      `FLEET_URL=${AGENT_FLEET_URL}`,
      '-e',
      `FLEET_ENROLLMENT_TOKEN=${enrollmentToken}`,
      '-e',
      'FLEET_INSECURE=true',
      agentImage,
    ]);
    agentStarted = true;

    try {
      await waitForAgentOnline(kbnClient, log, syntheticsPolicyId);
    } catch (error) {
      log.error(`Agent failed to come online:\n${containerLogs(SYNTHETICS_AGENT_CONTAINER)}`);
      throw error;
    }

    return {
      stack: {
        privateLocation,
        target: { port: target.port, url: target.url, host: target.host },
      },
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
