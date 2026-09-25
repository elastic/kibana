/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient, KbnClient, ScoutTestConfig } from '@kbn/scout-security';
import { createSystemIndicesEsClient } from './system_indices_es_client';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
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
}: Omit<SeedResponseActionsHistoryParams, 'spaceId' | 'config'> & {
  numResponseActions: number;
  alertIds?: string[];
  isServerless: boolean;
  hostNamePrefix?: string;
}): Promise<IndexedHostsAndAlertsResponse> => {
  return indexHostsAndAlerts(
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
    isServerless
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
  readonly alertId: string;
  cleanup: () => Promise<void>;
}

const SPACE_ALERTS_INDEX_PREFIX = '.alerts-security.alerts-';

/**
 * The rule-alert loader always writes `.alerts-security.alerts-default`. A Scout
 * worker space reads its own alerts index, so copy the document there after the
 * detection engine has created that index.
 */
const copyAlertIntoSpace = async (
  esClient: EsClient,
  sourceIndex: string,
  alertId: string,
  spaceId: string
): Promise<void> => {
  if (spaceId === 'default') {
    return;
  }

  const spaceIndex = `${SPACE_ALERTS_INDEX_PREFIX}${spaceId}`;
  const document = await esClient.get<Record<string, unknown>>({
    index: sourceIndex,
    id: alertId,
  });
  if (!document._source) {
    throw new Error(`Indexed alert "${alertId}" has no source document to copy into ${spaceIndex}`);
  }

  await esClient.index({
    index: spaceIndex,
    id: alertId,
    body: document._source,
    refresh: 'wait_for',
  });
};

const ensureSpaceAlertsIndex = async (kbnClient: KbnClient): Promise<void> => {
  try {
    await kbnClient.request({
      method: 'POST',
      path: DETECTION_ENGINE_INDEX_URL,
      headers: {
        'elastic-api-version': '2023-10-31',
        'x-elastic-internal-origin': 'kibana',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists|resource_already_exists/i.test(message)) {
      throw error;
    }
  }
};

/**
 * Indexes one endpoint rule alert and one automated isolate action for that
 * alert. The action status is chosen by the shared data loader, so callers
 * should accept pending, successful, and failed isolate copy.
 */
export const seedAlertFlyoutResponseAction = async ({
  esClient,
  kbnClient: rootKbnClient,
  spaceId,
  config,
}: SeedResponseActionsHistoryParams): Promise<SeededAlertFlyoutResponseAction> => {
  const kbnClient = scopeKbnClientToSpace(rootKbnClient, spaceId);
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  let alerts: IndexedEndpointRuleAlerts | undefined;
  let host: IndexedHostsAndAlertsResponse | undefined;
  let alertId: string | undefined;
  let cleanupStarted = false;

  const cleanup = async (): Promise<void> => {
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;

    const deletions: Array<Promise<unknown>> = [];
    if (host) {
      deletions.push(deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, host));
    }
    if (alerts) {
      deletions.push(alerts.cleanup());
    }
    if (alertId && spaceId !== 'default') {
      deletions.push(
        systemEsClient
          .delete({
            index: `${SPACE_ALERTS_INDEX_PREFIX}${spaceId}`,
            id: alertId,
            refresh: 'wait_for',
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes('404')) {
              throw error;
            }
          })
      );
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
      throw new AggregateError(
        errors,
        'Failed to clean up the seeded alert flyout response action'
      );
    }
  };

  try {
    await ensureSpaceAlertsIndex(kbnClient);

    const endpointAgentId = randomUUID();
    alerts = await indexEndpointRuleAlerts({
      esClient: systemEsClient,
      kbnClient,
      endpointAgentId,
      endpointHostname: `flyout-results-${randomUUID()}`,
      endpointIsolated: false,
    });

    const indexedAlert = alerts.alerts[0];
    alertId = indexedAlert?._id;
    const sourceIndex = indexedAlert?._index;
    if (!alertId || !sourceIndex) {
      throw new Error('Failed to index an endpoint rule alert for the flyout response action');
    }

    await copyAlertIntoSpace(systemEsClient, sourceIndex, alertId, spaceId);

    host = await indexResponseActionHost({
      esClient: systemEsClient,
      kbnClient,
      numResponseActions: 1,
      alertIds: [alertId],
      isServerless: config.serverless,
      hostNamePrefix: 'flyout-results',
    });

    const seededAlertId = alertId;
    return {
      alertId: seededAlertId,
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};
