/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  ISavedObjectsRepository,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { asSpaceId } from '@kbn/core-spaces-common';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import { UNIVERSAL_ALERT_SOURCE } from '../../common/automation_limits';
import type { NightshiftAutomationAttributes } from '../lib/automations/types';
import { createMemoryStore } from '../memory/register_memory';
import {
  NIGHTSHIFT_AUTOMATION_SO_TYPE,
  NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
  NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
  type NightshiftCustomContextAttributes,
  type NightshiftSandboxAllowlistAttributes,
} from '../saved_objects';
import type { DetectionSnapshotContributor } from './detection_snapshot_event';
import type { DetectionSnapshotSources } from './detection_snapshot_task';

export const DETECTION_SNAPSHOT_SO_TYPES = [
  NIGHTSHIFT_AUTOMATION_SO_TYPE,
  NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
  NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
];

// Connector types whose inbound events a managed workflow translates into alerts.
const EXTERNAL_ALERT_CONNECTOR_TYPE_IDS = ['.datadog'];
const ELIGIBLE_RULES_FILTER = 'kind: alert and enabled: true';
const MAX_AUTOMATIONS = 1000;

interface AlertActivityAggregations {
  significant_events: { alerts: { value: number } };
  external: { alerts: { value: number }; sources: { value: number } };
}

export const createDetectionSnapshotSources = ({
  request,
  esClient,
  soRepository,
  listSpaceIds,
  alertingVTwo,
  actions,
  isMemoryEnabled,
  contributor,
  logger,
}: {
  /** Carries the credentials the task was scheduled with; rules are read with them. */
  request: KibanaRequest;
  /** Internal user: the alert events, memory and saved objects indices are system indices. */
  esClient: ElasticsearchClient;
  /** Created with {@link DETECTION_SNAPSHOT_SO_TYPES} included. */
  soRepository: ISavedObjectsRepository;
  listSpaceIds: () => Promise<string[]>;
  alertingVTwo?: AlertingV2ServerStart;
  actions?: ActionsPluginStart;
  isMemoryEnabled: boolean;
  contributor?: DetectionSnapshotContributor;
  logger: Logger;
}): DetectionSnapshotSources => ({
  listSpaceIds,

  listAutomations: async (spaceId) => {
    const { saved_objects: savedObjects } = await soRepository.find<NightshiftAutomationAttributes>(
      {
        type: NIGHTSHIFT_AUTOMATION_SO_TYPE,
        namespaces: [spaceId],
        perPage: MAX_AUTOMATIONS,
      }
    );
    return savedObjects.map(({ attributes }) => attributes);
  },

  findEligibleRules: async (spaceId, { page, perPage }) => {
    if (!alertingVTwo) return { rules: [], total: 0 };
    const rulesClient = await alertingVTwo.getRulesClientWithRequestInSpace(
      request,
      asSpaceId(spaceId)
    );
    const { items, total } = await rulesClient.findRules({
      filter: ELIGIBLE_RULES_FILTER,
      page,
      perPage,
      sortField: 'name',
      sortOrder: 'asc',
    });
    return {
      rules: items.map(({ metadata: { name, tags } }) => ({ name, tags: tags ?? [] })),
      total,
    };
  },

  countExternalConnectors: async (spaceId) => {
    if (!actions) return 0;
    const connectors = await actions.getUnsecuredActionsClient().getAll(asSpaceId(spaceId));
    return connectors.filter(({ actionTypeId }) =>
      EXTERNAL_ALERT_CONNECTOR_TYPE_IDS.includes(actionTypeId)
    ).length;
  },

  getAlertActivity: async (spaceId) => {
    const alerts = { cardinality: { field: 'alert.id' } };
    const { aggregations } = await esClient.search<unknown, AlertActivityAggregations>({
      index: ALERT_EVENTS_DATA_STREAM,
      size: 0,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { space_id: spaceId } },
            { range: { '@timestamp': { gte: 'now-24h' } } },
          ],
        },
      },
      aggs: {
        significant_events: {
          filter: { term: { source: SIGNIFICANT_EVENTS_ALERT_SOURCE } },
          aggs: { alerts },
        },
        external: {
          // Alerting v2 reserves `elastic.` for Elastic-produced events.
          filter: {
            bool: {
              must_not: [
                { term: { source: UNIVERSAL_ALERT_SOURCE } },
                { prefix: { source: 'elastic.' } },
              ],
            },
          },
          aggs: { alerts, sources: { cardinality: { field: 'source' } } },
        },
      },
    });
    return {
      significant_events_24h: aggregations?.significant_events.alerts.value ?? 0,
      external_alerts_24h: aggregations?.external.alerts.value ?? 0,
      external_sources_active_24h: aggregations?.external.sources.value ?? 0,
    };
  },

  countMemoryPages: async (spaceId) => {
    if (!isMemoryEnabled) return undefined;
    const { total } = await createMemoryStore({ esClient, logger, spaceId }).listPaginated({
      filter: 'active',
      size: 1,
    });
    return total;
  },

  getSettings: async (spaceId) => {
    const [customContext, sandboxAllowlist] = await Promise.all([
      soRepository.find<NightshiftCustomContextAttributes>({
        type: NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
        namespaces: [spaceId],
        perPage: 1,
      }),
      soRepository.find<NightshiftSandboxAllowlistAttributes>({
        type: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
        namespaces: [spaceId],
        perPage: 1,
      }),
    ]);
    return {
      custom_context_snippets: customContext.saved_objects[0]?.attributes.snippets.length ?? 0,
      sandbox_allowlist_hosts: sandboxAllowlist.saved_objects[0]?.attributes.hosts.length ?? 0,
    };
  },

  getKnowledgeCounts: async (spaceId) => contributor?.({ spaceId, request }),
});
