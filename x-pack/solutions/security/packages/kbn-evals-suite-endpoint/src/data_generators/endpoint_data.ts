/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  metadataCurrentIndexPattern,
  METADATA_UNITED_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';

const POLL_INTERVAL_MS = 5_000;

const EVAL_AGENT_ID_PREFIX = 'eval-agent-';
const EVAL_SEEDED_QUERY = { prefix: { 'agent.id': EVAL_AGENT_ID_PREFIX } };

export async function waitForEndpointPackage(
  kbnClient: KbnClient,
  esClient: Client,
  log: ToolingLog,
  maxWaitMs = 120_000
): Promise<void> {
  const start = Date.now();
  log.info('Waiting for endpoint package to be installed...');

  while (Date.now() - start < maxWaitMs) {
    try {
      const response = await kbnClient.request<{ item: { status: string } }>({
        method: 'GET',
        path: '/api/fleet/epm/packages/endpoint',
      });

      if (response.data.item.status === 'installed') {
        log.info('Endpoint package is installed. Verifying transforms are started...');

        const statsResponse = await esClient.transform.getTransformStats({
          transform_id: 'endpoint*',
        });

        const stoppedTransforms = statsResponse.transforms.filter((t) => t.state === 'stopped');

        for (const t of stoppedTransforms) {
          log.info(`Restarting stopped transform: ${t.id}`);
          try {
            await esClient.transform.startTransform({ transform_id: t.id });
          } catch (e) {
            log.debug(`Failed to restart transform ${t.id}: ${e}`);
          }
        }

        const allStarted = statsResponse.transforms.every(
          (t) => t.state === 'started' || t.state === 'indexing'
        );

        if (allStarted || stoppedTransforms.length > 0) {
          log.info(
            `All endpoint transforms are running (${statsResponse.transforms.length} total)`
          );
          return;
        }

        log.debug(
          `Transforms not yet started: ${statsResponse.transforms
            .filter((t) => t.state !== 'started' && t.state !== 'indexing')
            .map((t) => `${t.id}=${t.state}`)
            .join(', ')}`
        );
      } else {
        log.debug(`Endpoint package status: ${response.data.item.status}`);
      }
    } catch (err) {
      log.debug(`Error checking endpoint package: ${err}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for endpoint package to be installed after ${maxWaitMs}ms`);
}

export async function waitForTransformPropagation(
  esClient: Client,
  log: ToolingLog,
  expectedCounts: { metadataCurrent: number; metadataUnited: number },
  maxWaitMs = 180_000
): Promise<void> {
  const start = Date.now();
  log.info(
    `Waiting for transform propagation: metadataCurrent >= ${expectedCounts.metadataCurrent}, metadataUnited >= ${expectedCounts.metadataUnited}`
  );

  while (Date.now() - start < maxWaitMs) {
    try {
      const [currentCount, unitedCount] = await Promise.all([
        esClient.count({
          index: metadataCurrentIndexPattern,
          query: EVAL_SEEDED_QUERY,
          ignore_unavailable: true,
        }),
        esClient.count({
          index: METADATA_UNITED_INDEX,
          query: EVAL_SEEDED_QUERY,
          ignore_unavailable: true,
        }),
      ]);

      log.debug(
        `Transform propagation: metadataCurrent=${currentCount.count}/${expectedCounts.metadataCurrent}, metadataUnited=${unitedCount.count}/${expectedCounts.metadataUnited}`
      );

      if (
        currentCount.count >= expectedCounts.metadataCurrent &&
        unitedCount.count >= expectedCounts.metadataUnited
      ) {
        log.info('Transform propagation complete');
        return;
      }
    } catch (err) {
      log.debug(`Error checking transform propagation: ${err}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for transform propagation after ${maxWaitMs}ms. ` +
      `Expected metadataCurrent >= ${expectedCounts.metadataCurrent}, metadataUnited >= ${expectedCounts.metadataUnited}`
  );
}

export interface SeedClients {
  esClient: Client;
  internalEsClient: Client;
}

interface EndpointScenario {
  agentId: string;
  hostName: string;
  os: { name: string; version: string };
  policyName: string;
  policyStatus: string;
  extraDocuments?: Array<{
    index: string;
    document: Record<string, unknown>;
  }>;
}

export async function seedScenario(clients: SeedClients, scenario: EndpointScenario) {
  const now = new Date().toISOString();
  const { agentId, hostName, os, policyName, policyStatus, extraDocuments = [] } = scenario;

  await clients.esClient.create({
    index: 'metrics-endpoint.metadata-default',
    id: `eval-metadata-${hostName}-${Date.now()}`,
    document: {
      '@timestamp': now,
      agent: { id: agentId, version: '8.16.0' },
      host: { name: hostName, os },
      Endpoint: {
        status: 'enrolled',
        policy: { applied: { status: policyStatus, name: policyName } },
      },
      elastic: { agent: { id: agentId } },
    },
  });

  await clients.internalEsClient.index({
    index: '.fleet-agents',
    id: `eval-fleet-${agentId}`,
    document: {
      '@timestamp': now,
      agent: { id: agentId, version: '8.16.0' },
      local_metadata: { host: { name: hostName } },
      active: true,
      enrolled_at: now,
      last_checkin: now,
    },
  });

  for (const extra of extraDocuments) {
    await clients.esClient.create({
      index: extra.index,
      id: `eval-${hostName}-${Date.now()}`,
      document: { '@timestamp': now, ...extra.document },
    });
  }
}

export const SCENARIOS = {
  incompatibleAntivirus: {
    agentId: 'eval-agent-av-001',
    hostName: 'eval-host-av',
    os: { name: 'Windows', version: '10' },
    policyName: 'eval-policy-av',
    policyStatus: 'success',
    extraDocuments: [
      { name: 'MsMpEng.exe', description: 'Windows Defender' },
      { name: 'avp.exe', description: 'Kaspersky Antivirus' },
      { name: 'CSFalconService.exe', description: 'CrowdStrike Falcon' },
      { name: 'SentinelAgent.exe', description: 'SentinelOne' },
    ].map((proc, i) => ({
      index: 'logs-endpoint.events.process-default',
      document: {
        agent: { id: 'eval-agent-av-001' },
        host: { name: 'eval-host-av' },
        event: { type: 'start', category: 'process' },
        process: { name: proc.name, pid: 1000 + i, executable: `C:\\Program Files\\${proc.name}` },
        message: `Antivirus process detected: ${proc.description} (${proc.name})`,
      },
    })),
  },

  policyResponseFailure: {
    agentId: 'eval-agent-policy-001',
    hostName: 'eval-host-policy',
    os: { name: 'Linux', version: 'Ubuntu 22.04' },
    policyName: 'eval-policy-strict',
    policyStatus: 'failure',
    extraDocuments: [
      {
        index: 'metrics-endpoint.policy-default',
        document: {
          agent: { id: 'eval-agent-policy-001' },
          host: { name: 'eval-host-policy' },
          Endpoint: {
            policy: {
              applied: {
                status: 'failure',
                name: 'eval-policy-strict',
                id: 'eval-policy-id-001',
                version: 3,
                endpoint_policy_version: 2,
                response: {
                  configurations: {
                    malware: { status: 'failure', concerned_actions: ['enable_kernel_extension'] },
                  },
                },
              },
            },
          },
          event: { type: 'state', category: 'host' },
          message: 'Endpoint policy application failed: kernel extension could not be loaded',
        },
      },
    ],
  },

  stoppedUnitedTransform: {
    agentId: 'eval-agent-transform-001',
    hostName: 'eval-host-transform',
    os: { name: 'Windows', version: '11' },
    policyName: 'eval-policy-transform',
    policyStatus: 'success',
  },
} satisfies Record<string, EndpointScenario>;
