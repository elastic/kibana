/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient, KbnClient, ScoutTestConfig } from '@kbn/scout-security';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { EndpointMetadataGenerator } from '../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { METADATA_DATASTREAM, POLICY_RESPONSE_INDEX } from '../../../../common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  indexHostsAndAlerts,
  type IndexedHostsAndAlertsResponse,
} from '../../../../common/endpoint/index_data';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_DEVICE_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../scripts/endpoint/common/constants';
import { createSystemIndicesEsClient } from '../ui/fixtures/system_indices_es_client';
import { scopeKbnClientToSpace } from './scope_kbn_client_to_space';
import { withMetadataTransformLock } from './with_metadata_transform_lock';

export interface SeededEndpointHost {
  readonly agentId: string;
  readonly hostname: string;
}

export interface SeededEndpointHosts {
  readonly hosts: readonly SeededEndpointHost[];
  cleanup: () => Promise<void>;
}

export interface SeededHostAlert extends SeededEndpointHost {
  readonly ruleName: string;
  readonly alertId: string;
  readonly ruleId: string;
}

interface SeedEndpointHostsParams {
  esClient: EsClient;
  kbnClient: KbnClient;
  spaceId: string;
  config: ScoutTestConfig;
  count: number;
  isolation: boolean;
}

const hostIdentity = (indexed: IndexedHostsAndAlertsResponse): SeededEndpointHost[] => {
  return indexed.hosts.map((host) => {
    const agentId = host.agent.id;
    const hostname = host.host.name;

    if (!agentId || !hostname) {
      throw new Error('Indexed endpoint host is missing an agent id or hostname');
    }

    return { agentId, hostname };
  });
};

/**
 * Indexes endpoint hosts with `Endpoint.state.isolation` set, using a fake Fleet
 * enrollment. Does not start Fleet Server or a real agent.
 */
export const seedEndpointHosts = async ({
  esClient,
  kbnClient: rootKbnClient,
  spaceId,
  config,
  count,
  isolation,
}: SeedEndpointHostsParams): Promise<SeededEndpointHosts> => {
  const kbnClient = scopeKbnClientToSpace(rootKbnClient, spaceId);
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  let indexed: IndexedHostsAndAlertsResponse | undefined;
  let cleanupStarted = false;

  const cleanup = async (): Promise<void> => {
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;

    const failures: unknown[] = [];
    if (indexed) {
      try {
        await deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, indexed);
      } catch (error) {
        failures.push(error);
      }
    }

    try {
      await systemEsClient.close();
    } catch (error) {
      failures.push(error);
    }

    if (failures.length === 1) {
      throw failures[0];
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Failed to clean up seeded endpoint hosts');
    }
  };

  try {
    const DocGenerator = EndpointDocGenerator.custom({
      CustomMetadataGenerator: EndpointMetadataGenerator.custom({ isolation }),
    });

    indexed = await withMetadataTransformLock(() =>
      indexHostsAndAlerts(
        systemEsClient,
        kbnClient,
        `isolate-metadata-${randomUUID()}`,
        count,
        1,
        METADATA_DATASTREAM,
        POLICY_RESPONSE_INDEX,
        ENDPOINT_EVENTS_INDEX,
        ENDPOINT_ALERTS_INDEX,
        ENDPOINT_DEVICE_INDEX,
        0,
        true,
        {},
        DocGenerator,
        false,
        undefined,
        undefined,
        config.serverless
      )
    );

    return { hosts: hostIdentity(indexed), cleanup };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};

interface SeedHostAlertParams {
  esClient: EsClient;
  kbnClient: KbnClient;
  spaceId: string;
  config: ScoutTestConfig;
}

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const ALERT_WAIT_MS = 120_000;

/**
 * Seeds one non-isolated host and waits for a detection rule to write an alert
 * for it. Rule execution creates the space alerts index; a hand-indexed document
 * would not.
 */
export const seedHostWithAlert = async ({
  esClient,
  kbnClient,
  spaceId,
  config,
}: SeedHostAlertParams): Promise<SeededHostAlert & { cleanup: () => Promise<void> }> => {
  const seeded = await seedEndpointHosts({
    esClient,
    kbnClient,
    spaceId,
    config,
    count: 1,
    isolation: false,
  });
  const host = seeded.hosts[0];
  if (!host) {
    await seeded.cleanup();
    throw new Error('Failed to index an endpoint host');
  }

  const scopedKbnClient = scopeKbnClientToSpace(kbnClient, spaceId);
  const runId = randomUUID().replaceAll('-', '');
  const ruleName = `Isolate host ${runId}`;
  const eventsIndex = `filebeat-scout-isolate-${runId}`;
  const alertsIndex = `.alerts-security.alerts-${spaceId}`;
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);

  let alertId: string | undefined;
  let createdRuleId: string | undefined;

  const cleanup = async (): Promise<void> => {
    const failures: unknown[] = [];
    if (createdRuleId) {
      try {
        await scopedKbnClient.request({
          method: 'DELETE',
          path: `${DETECTION_ENGINE_RULES_URL}?id=${encodeURIComponent(createdRuleId)}`,
          headers: {
            'kbn-xsrf': 'scout',
            ...PUBLIC_API_HEADERS,
          },
        });
      } catch (error) {
        failures.push(error);
      }
    }
    try {
      await systemEsClient.indices.delete({ index: eventsIndex, ignore_unavailable: true });
    } catch (error) {
      failures.push(error);
    }
    if (alertId) {
      try {
        await systemEsClient.delete({ index: alertsIndex, id: alertId, refresh: 'wait_for' });
      } catch (error) {
        failures.push(error);
      }
    }
    try {
      await systemEsClient.close();
    } catch (error) {
      failures.push(error);
    }
    try {
      await seeded.cleanup();
    } catch (error) {
      failures.push(error);
    }
    if (failures.length === 1) {
      throw failures[0];
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Failed to clean up seeded host alert');
    }
  };

  try {
    await systemEsClient.index({
      index: eventsIndex,
      refresh: 'wait_for',
      document: {
        '@timestamp': new Date().toISOString(),
        message: runId,
        agent: { id: host.agentId, type: 'endpoint' },
        host: { name: host.hostname, hostname: host.hostname },
      },
    });

    const created = await scopedKbnClient.request<{ id: string }>({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_URL,
      headers: {
        'kbn-xsrf': 'scout',
        ...PUBLIC_API_HEADERS,
      },
      body: {
        name: ruleName,
        description: 'Host isolation Scout alert',
        risk_score: 1,
        rule_id: runId,
        severity: 'high',
        type: 'query',
        language: 'kuery',
        query: `message: "${runId}"`,
        index: [eventsIndex],
        from: 'now-15m',
        interval: '1m',
        enabled: true,
      },
    });
    createdRuleId = created.data.id;

    alertId = await waitForRuleAlert({
      esClient: systemEsClient,
      alertsIndex,
      ruleName,
    });

    return {
      ...host,
      ruleName,
      ruleId: createdRuleId,
      alertId,
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};

const waitForRuleAlert = async ({
  esClient,
  alertsIndex,
  ruleName,
}: {
  esClient: Awaited<ReturnType<typeof createSystemIndicesEsClient>>;
  alertsIndex: string;
  ruleName: string;
}): Promise<string> => {
  const deadline = Date.now() + ALERT_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      await esClient.indices.refresh({ index: alertsIndex });
      const result = await esClient.search<{ 'kibana.alert.rule.name': string }>({
        index: alertsIndex,
        size: 1,
        query: { term: { 'kibana.alert.rule.name': ruleName } },
      });
      const alertId = result.hits.hits[0]?._id;
      if (alertId) {
        return alertId;
      }
    } catch {
      // The alerts index is created when the rule writes its first alert.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for detection alert "${ruleName}" in ${alertsIndex}`);
};
