/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type {
  EsClient,
  KbnClient,
  ScoutTestConfig,
  SecurityApiServicesFixture,
} from '@kbn/scout-security';
import { withMetadataTransformLock } from '../../common/with_metadata_transform_lock';
import { createSystemIndicesEsClient } from './system_indices_es_client';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  ENDPOINT_ACTIONS_INDEX,
  METADATA_DATASTREAM,
  POLICY_RESPONSE_INDEX,
} from '../../../../../common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  indexHostsAndAlerts,
  type IndexedHostsAndAlertsResponse,
} from '../../../../../common/endpoint/index_data';
import {
  indexEndpointRuleAlerts,
  type IndexedEndpointRuleAlerts,
} from '../../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_DEVICE_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../../scripts/endpoint/common/constants';

/**
 * Rule id written onto automated response actions when they are indexed with
 * alert ids. See `buildIEndpointAndFleetActionsBulkOperations`.
 */
export const SEEDED_AUTOMATED_ACTION_RULE_ID = 'generated_rule_id';

export interface SeededResponseActionsHistory {
  readonly agentIds: readonly string[];
  readonly manualHostname: string;
  readonly automatedHostname: string;
  readonly ruleId: string;
  cleanup: () => Promise<void>;
}

interface SeedResponseActionsHistoryParams {
  esClient: EsClient;
  kbnClient: KbnClient;
  spaceId: string;
  config: ScoutTestConfig;
}

/**
 * Fleet data stream namespaces reject these characters. Hyphen is included, so a
 * Scout space id such as `test-space-2` cannot be used as `namespace`.
 */
const INVALID_FLEET_NAMESPACE_CHARACTERS = /[\\/*?"<>|\s,#:-]/;
const FLEET_DATA_STREAM_NAMESPACE = 'default';

/**
 * Fleet policies and response actions are visible only in the space that
 * created them. Scope Kibana requests at the worker space so the history
 * page, which runs in that space, can see the seeded rows.
 *
 * The endpoint data loader copies the active space id into the agent policy
 * `namespace`. That field is a data stream namespace, not a Kibana space id,
 * so rewrite invalid values to `default`.
 */
const scopeKbnClientToSpace = (kbnClient: KbnClient, spaceId: string): KbnClient => {
  const prefix = `/s/${spaceId}`;

  return new Proxy(kbnClient, {
    get(target, property, receiver) {
      if (property === 'request') {
        return (options: Parameters<KbnClient['request']>[0]) => {
          const path = options.path.startsWith('/') ? options.path : `/${options.path}`;
          const scopedPath = path.startsWith(`${prefix}/`) ? path : `${prefix}${path}`;
          return target.request({
            ...withValidFleetNamespace(options),
            path: scopedPath,
          });
        };
      }

      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as KbnClient;
};

const withValidFleetNamespace = (
  options: Parameters<KbnClient['request']>[0]
): Parameters<KbnClient['request']>[0] => {
  const { body } = options;
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('namespace' in body)) {
    return options;
  }

  const namespace = body.namespace;
  if (typeof namespace !== 'string' || !INVALID_FLEET_NAMESPACE_CHARACTERS.test(namespace)) {
    return options;
  }

  return {
    ...options,
    body: {
      ...body,
      namespace: FLEET_DATA_STREAM_NAMESPACE,
    },
  };
};

const indexResponseActionHost = ({
  esClient,
  kbnClient,
  numResponseActions,
  alertIds,
  isServerless,
  hostNamePrefix = 'history-log',
  responseState,
}: Omit<SeedResponseActionsHistoryParams, 'spaceId' | 'config'> & {
  numResponseActions: number;
  alertIds?: string[];
  isServerless: boolean;
  hostNamePrefix?: string;
  responseState?: 'success';
}): Promise<IndexedHostsAndAlertsResponse> => {
  return withMetadataTransformLock(() =>
    indexHostsAndAlerts(
      esClient,
      kbnClient,
      `${hostNamePrefix}-${randomUUID()}`,
      1,
      1,
      METADATA_DATASTREAM,
      POLICY_RESPONSE_INDEX,
      ENDPOINT_EVENTS_INDEX,
      ENDPOINT_ALERTS_INDEX,
      ENDPOINT_DEVICE_INDEX,
      1,
      true,
      {},
      EndpointDocGenerator,
      true,
      numResponseActions,
      alertIds,
      isServerless,
      undefined,
      responseState
    )
  );
};

const hostIdentity = (
  indexed: IndexedHostsAndAlertsResponse
): { agentId: string; hostname: string } => {
  const host = indexed.hosts[indexed.hosts.length - 1];
  const agentId = host?.agent.id;
  const hostname = host?.host.name;

  if (!agentId || !hostname) {
    throw new Error('Indexed endpoint host is missing an agent id or hostname');
  }

  return { agentId, hostname };
};

/**
 * Indexes the same mix the Cypress history spec used: two manual response
 * actions on one host, and one rule-triggered action on another host.
 * `indexEndpointHostDocs` adds `randomN(5)` actions when the requested count
 * is not 1, so the manual host can have more than two rows. Response actions
 * live in a deployment-wide index, so callers should scope the history page
 * to `agentIds`.
 */
export const seedResponseActionsHistory = async ({
  esClient,
  kbnClient: rootKbnClient,
  spaceId,
  config,
}: SeedResponseActionsHistoryParams): Promise<SeededResponseActionsHistory> => {
  const kbnClient = scopeKbnClientToSpace(rootKbnClient, spaceId);
  // `.fleet-agents` is a restricted index. The endpoint data loader creates it by
  // indexing a fleet server agent, which Scout's `elastic` user cannot auto-create.
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  let manual: IndexedHostsAndAlertsResponse | undefined;
  let automated: IndexedHostsAndAlertsResponse | undefined;
  let alerts: IndexedEndpointRuleAlerts | undefined;
  let cleanupStarted = false;

  const cleanup = async (): Promise<void> => {
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;

    // A failure deleting one host must not skip the others. These deletes also
    // remove Fleet agents and policies from the shared deployment.
    const deletions: Array<Promise<unknown>> = [];
    if (automated) {
      deletions.push(deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, automated));
    }
    if (manual) {
      deletions.push(deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, manual));
    }
    if (alerts) {
      deletions.push(alerts.cleanup());
    }

    const results = await Promise.allSettled(deletions);
    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    );

    try {
      await systemEsClient.close();
    } catch (error) {
      failures.push(error);
    }

    const errors = failures.map((failure) =>
      failure instanceof Error ? failure : new Error(String(failure))
    );
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, 'Failed to clean up seeded response action history');
    }
  };

  try {
    const endpointAgentId = randomUUID();
    alerts = await indexEndpointRuleAlerts({
      esClient: systemEsClient,
      kbnClient,
      endpointAgentId,
      endpointHostname: `history-log-alert-${randomUUID()}`,
      endpointIsolated: false,
    });

    const alertId = alerts.alerts[0]?._id;
    if (!alertId) {
      throw new Error('Failed to index an endpoint rule alert for response action history');
    }

    manual = await indexResponseActionHost({
      esClient: systemEsClient,
      kbnClient,
      numResponseActions: 2,
      isServerless: config.serverless,
    });
    automated = await indexResponseActionHost({
      esClient: systemEsClient,
      kbnClient,
      numResponseActions: 1,
      alertIds: [alertId],
      isServerless: config.serverless,
    });

    const manualHost = hostIdentity(manual);
    const automatedHost = hostIdentity(automated);
    await assertAutomatedActionRuleId(systemEsClient, automatedHost.agentId);

    return {
      agentIds: [manualHost.agentId, automatedHost.agentId],
      manualHostname: manualHost.hostname,
      automatedHostname: automatedHost.hostname,
      ruleId: SEEDED_AUTOMATED_ACTION_RULE_ID,
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};

const assertAutomatedActionRuleId = async (esClient: EsClient, agentId: string): Promise<void> => {
  const response = await esClient.search<{ rule?: { id?: string } }>({
    index: ENDPOINT_ACTIONS_INDEX,
    size: 1,
    query: {
      bool: {
        filter: [{ term: { 'agent.id': agentId } }, { term: { 'user.id': 'unknown' } }],
      },
    },
  });
  const ruleId = response.hits.hits[0]?._source?.rule?.id;

  if (ruleId !== SEEDED_AUTOMATED_ACTION_RULE_ID) {
    throw new Error(
      `Expected the seeded automated response action to reference rule "${SEEDED_AUTOMATED_ACTION_RULE_ID}", got "${ruleId}"`
    );
  }
};

export interface SeededAlertFlyoutResponseAction {
  readonly ruleName: string;
  cleanup: () => Promise<void>;
}

const SPACE_ALERTS_INDEX_PREFIX = '.alerts-security.alerts-';
const ALERT_WAIT_TIMEOUT_MS = 180_000;
const ALERT_WAIT_INTERVAL_MS = 1_000;

/**
 * The alerts page only mounts `alertsTableIsLoaded` when the search returns at
 * least one hit. A document copied into `.alerts-security.alerts-<space>` does
 * not go through the detection engine, so that search stays empty. Run a query
 * rule in the worker space and use the alert it writes.
 */
const waitForSpaceAlertId = async (
  esClient: EsClient,
  spaceId: string,
  ruleName: string
): Promise<string> => {
  const index = `${SPACE_ALERTS_INDEX_PREFIX}${spaceId}`;
  const deadline = Date.now() + ALERT_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await esClient.indices.refresh({ index });
      const response = await esClient.search({
        index,
        size: 1,
        query: { term: { 'kibana.alert.rule.name': ruleName } },
      });
      const alertId = response.hits.hits[0]?._id;
      if (alertId) {
        return alertId;
      }
    } catch {
      // The space alerts index is created when the rule first runs.
    }

    await new Promise((resolve) => setTimeout(resolve, ALERT_WAIT_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for an alert from rule "${ruleName}" in space "${spaceId}"`);
};

/**
 * Creates one detection alert in the worker space and one successful automated
 * isolate action for that alert.
 */
export const seedAlertFlyoutResponseAction = async ({
  esClient,
  kbnClient: rootKbnClient,
  spaceId,
  config,
  detectionRule,
  detectionAlerts,
}: SeedResponseActionsHistoryParams &
  Pick<
    SecurityApiServicesFixture,
    'detectionRule' | 'detectionAlerts'
  >): Promise<SeededAlertFlyoutResponseAction> => {
  const kbnClient = scopeKbnClientToSpace(rootKbnClient, spaceId);
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  const sourceIndex = `flyout-results-source-${randomUUID()}`;
  const ruleId = `flyout-results-${randomUUID()}`;
  const ruleName = `Flyout results ${ruleId}`;
  let host: IndexedHostsAndAlertsResponse | undefined;
  let ruleCreated = false;
  let cleanupStarted = false;

  const cleanup = async (): Promise<void> => {
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;

    const failures: unknown[] = [];
    // Stop the rule before deleting its alerts. The query matches every
    // document, so a run that overlaps teardown can write a new alert.
    if (ruleCreated) {
      try {
        await detectionRule.deleteAll();
      } catch (error) {
        failures.push(error);
      }
    }

    const deletions: Array<Promise<unknown>> = [];
    if (host) {
      deletions.push(deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, host));
    }
    deletions.push(detectionAlerts.deleteAll());
    deletions.push(esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true }));

    const results = await Promise.allSettled(deletions);
    failures.push(
      ...results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))
    );

    try {
      await systemEsClient.close();
    } catch (error) {
      failures.push(error);
    }

    const errors = failures.map((failure) =>
      failure instanceof Error ? failure : new Error(String(failure))
    );
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        'Failed to clean up the seeded alert flyout response action'
      );
    }
  };

  try {
    await esClient.indices.create({
      index: sourceIndex,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          message: { type: 'keyword' },
        },
      },
    });
    await esClient.index({
      index: sourceIndex,
      document: {
        '@timestamp': new Date().toISOString(),
        message: 'flyout-results',
      },
      refresh: 'wait_for',
    });

    const { id: createdRuleId } = await detectionRule.createCustomQueryRule({
      index: [sourceIndex],
      enabled: true,
      name: ruleName,
      description: 'Scout alert for the response flyout',
      risk_score: 1,
      rule_id: ruleId,
      severity: 'high',
      type: 'query',
      query: '*:*',
      from: '2019-01-01T00:00:00.000Z',
      interval: '1m',
    });
    ruleCreated = true;

    const alertId = await waitForSpaceAlertId(esClient, spaceId, ruleName);
    // The alert id is stable for this source document. Disable the rule so a
    // later run cannot write that alert back after cleanup deletes it.
    // deleteAll does not cancel an execution that has already started.
    await detectionRule.disable(createdRuleId);

    host = await indexResponseActionHost({
      esClient: systemEsClient,
      kbnClient,
      numResponseActions: 1,
      alertIds: [alertId],
      isServerless: config.serverless,
      hostNamePrefix: 'flyout-results',
      responseState: 'success',
    });

    return {
      ruleName,
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};
