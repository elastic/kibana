/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { MessageRole } from '@kbn/inference-common';
import {
  bucketRumAlertFires,
  collapseRumAlertEpisodes,
  lastRumAlertFiredAt,
  type RumAlertFireBucket,
} from '../../../common/rum_alert_episodes';
import {
  buildRumAlertEsql,
  buildRumEmailWorkflowYaml,
  defaultAlertName,
  isRumAiAlertTemplate,
  isRumAlertTemplateId,
  isRumAlertVital,
  isRumSessionAlertTemplate,
  RUM_ALERT_NOTIFICATIONS_SO_ID,
  RUM_ALERT_NOTIFICATIONS_SO_TYPE,
  RUM_ALERT_TAG,
  RUM_ALERT_TEMPLATE_TAG_PREFIX,
  rumAlertServiceFromQuery,
  rumAlertServiceFromTags,
  type RumAlertTemplateId,
} from '../../../common/rum_alerts';
import {
  assertRumAlertEsql,
  extractRumAlertEsqlFromLlm,
  injectLookbackAfterFrom,
  isPlaceholderRumAlertEsql,
  RUM_ALERT_AI_SYSTEM_PROMPT,
  rumAlertGroupingFieldsFromQuery,
  rumAlertTimeField,
  stripFinalWhere,
} from '../../../common/rum_alert_esql';
import { getRumAnalyticsStatus } from '../../transforms/rum_sessions';
import { parseRecipientList } from '../../../common/rum_report_schedule';
import type { RumAlertNotificationsAttributes } from '../../saved_objects/rum_alert_notifications';
import { createUxServerRoute } from '../create_ux_server_route';
import type { UxRouteHandlerResources } from '../types';
import { boundedString } from './query';
import { rumEsSearchOptions, withRumEsRetry } from './es_retry';
import { expandRumEsqlFrom } from '../../../common/rum_ccs';
import { getRumCcsOptions, getRumSearchClient } from '../../lib/rum_search_client';

export interface RumAlertRuleSummary {
  id: string;
  name: string;
  enabled: boolean;
  templateId: RumAlertTemplateId | null;
  serviceName?: string;
  description: string;
  every: string;
  lookback?: string;
  createdAt: string;
  updatedAt: string;
  lastFiredAt?: string;
}

export interface RumAlertEpisodeSummary {
  timestamp: string;
  episodeId?: string;
  status?: string;
  ruleId?: string;
  groupHash?: string;
}

const filtersCodec = t.partial({
  serviceName: boundedString(256),
  browser: boundedString(128),
  location: boundedString(8),
  pageUrl: boundedString(512),
});

const createBodyCodec = t.intersection([
  t.type({
    templateId: boundedString(32),
    threshold: t.number,
  }),
  t.partial({
    name: boundedString(200),
    minSamples: t.number,
    groupByPage: t.boolean,
    lookback: boundedString(16),
    every: boundedString(16),
    vital: boundedString(8),
    errorType: boundedString(128),
    errorMessage: boundedString(256),
    prompt: boundedString(2000),
    query: boundedString(8000),
    filters: filtersCodec,
  }),
]);

const notificationsBodyCodec = t.type({
  connectorId: boundedString(128),
  to: t.array(boundedString(256)),
});

const templateFromTags = (tags: string[] | undefined): RumAlertTemplateId | null => {
  const tagged = (tags ?? []).find((tag) => tag.startsWith(RUM_ALERT_TEMPLATE_TAG_PREFIX));
  if (!tagged) {
    return null;
  }
  const id = tagged.slice(RUM_ALERT_TEMPLATE_TAG_PREFIX.length);
  return isRumAlertTemplateId(id) ? id : null;
};

const breachQueryOf = (rule: RuleResponse): string => {
  const query = rule.query as { breach?: { query?: string } } | undefined;
  return typeof query?.breach?.query === 'string' ? query.breach.query : '';
};

const toSummary = (rule: RuleResponse): RumAlertRuleSummary => ({
  id: rule.id,
  name: rule.metadata.name,
  enabled: rule.enabled,
  templateId: templateFromTags(rule.metadata.tags),
  serviceName:
    rumAlertServiceFromTags(rule.metadata.tags) ?? rumAlertServiceFromQuery(breachQueryOf(rule)),
  description: rule.metadata.description ?? '',
  every: rule.schedule.every,
  lookback: rule.schedule.lookback,
  createdAt: rule.created_at,
  updatedAt: rule.updated_at,
});

const spaceIdOf = async (resources: UxRouteHandlerResources): Promise<string> => {
  const plugins = await resources.startPlugins();
  return plugins.spaces?.spacesService.getSpaceId(resources.request) ?? DEFAULT_SPACE_ID;
};

const requireAlerting = async (resources: UxRouteHandlerResources) => {
  const plugins = await resources.startPlugins();
  if (!plugins.alertingVTwo) {
    throw new Error('Alerting v2 is not available');
  }
  return plugins.alertingVTwo;
};

export const getRumAlertStatusRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/alerts/_status',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    available: boolean;
    notificationsConfigured: boolean;
    aiAvailable: boolean;
    connectorId?: string;
    to: string[];
  }> => {
    const plugins = await resources.startPlugins();
    if (!plugins.alertingVTwo) {
      return { available: false, notificationsConfigured: false, aiAvailable: false, to: [] };
    }
    const { savedObjects } = await resources.context.core;
    try {
      const so = await savedObjects.client.get<RumAlertNotificationsAttributes>(
        RUM_ALERT_NOTIFICATIONS_SO_TYPE,
        RUM_ALERT_NOTIFICATIONS_SO_ID
      );
      return {
        available: true,
        notificationsConfigured: Boolean(so.attributes.workflowId && so.attributes.policyId),
        aiAvailable: Boolean(plugins.inference),
        connectorId: so.attributes.connectorId,
        to: so.attributes.to,
      };
    } catch {
      return {
        available: true,
        notificationsConfigured: false,
        aiAvailable: Boolean(plugins.inference),
        to: [],
      };
    }
  },
});

export const listRumAlertsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/alerts',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    rules: RumAlertRuleSummary[];
    episodes: RumAlertEpisodeSummary[];
    fireTrend: RumAlertFireBucket[];
  }> => {
    const alerting = await requireAlerting(resources);
    const rulesClient = await alerting.getRulesClientWithRequest(resources.request);
    const found = await rulesClient.findRules({
      filter: `metadata.tags: "${RUM_ALERT_TAG}"`,
      perPage: 100,
      sortField: 'name',
      sortOrder: 'asc',
    });
    const events = await loadEpisodes(
      resources,
      found.items.map((rule) => rule.id)
    );
    const rules = found.items.map((rule) => {
      const summary = toSummary(rule);
      return { ...summary, lastFiredAt: lastRumAlertFiredAt(events, summary.id) };
    });
    return {
      rules,
      episodes: collapseRumAlertEpisodes(events),
      fireTrend: bucketRumAlertFires(events),
    };
  },
});

export const createRumAlertRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/alerts',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: createBodyCodec }),
  handler: async (resources): Promise<RumAlertRuleSummary> => {
    const body = resources.params.body;
    if (!isRumAlertTemplateId(body.templateId)) {
      throw new Error(`Unknown alert template: ${body.templateId}`);
    }
    if (body.vital && !isRumAlertVital(body.vital)) {
      throw new Error(`Unknown web vital: ${body.vital}`);
    }
    const vital = body.vital && isRumAlertVital(body.vital) ? body.vital : undefined;
    if (isRumAiAlertTemplate(body.templateId) && !body.query?.trim()) {
      throw new Error('Generated ES|QL is required for an AI alert');
    }
    const built = buildRumAlertEsql({
      templateId: body.templateId,
      name: body.name,
      threshold: body.threshold,
      minSamples: body.minSamples ?? 1,
      groupByPage: body.groupByPage ?? true,
      lookback: body.lookback ?? '15m',
      every: body.every ?? '5m',
      vital,
      errorType: body.errorType,
      errorMessage: body.errorMessage,
      prompt: body.prompt,
      esqlQuery: body.query,
      filters: body.filters ?? {},
    });
    if (isRumAiAlertTemplate(body.templateId)) {
      built.query = assertRumAlertEsql(built.query);
      built.groupingFields = rumAlertGroupingFieldsFromQuery(built.query);
    }
    built.query = expandRumEsqlFrom(built.query, await getRumCcsOptions(resources));
    const usesSessionIndex =
      isRumSessionAlertTemplate(body.templateId) || rumAlertTimeField(built.query) === 'start_time';
    if (usesSessionIndex) {
      const { elasticsearch } = await resources.context.core;
      const analytics = await getRumAnalyticsStatus(elasticsearch.client.asInternalUser);
      if (!analytics.installed) {
        throw new Error(
          'Session analytics must be installed before creating a session-level alert'
        );
      }
    }
    const alerting = await requireAlerting(resources);
    const rulesClient = await alerting.getRulesClientWithRequest(resources.request);
    const data: CreateRuleData = {
      kind: 'alert',
      metadata: {
        name: (
          body.name?.trim() ||
          defaultAlertName({
            templateId: body.templateId,
            threshold: body.threshold,
            minSamples: body.minSamples ?? 1,
            groupByPage: body.groupByPage ?? true,
            lookback: built.lookback,
            every: built.every,
            vital,
            prompt: body.prompt,
            filters: body.filters ?? {},
          })
        ).slice(0, 200),
        description: built.description,
        tags: built.tags,
        builder_type: 'ux_rum',
      },
      time_field: usesSessionIndex ? 'start_time' : '@timestamp',
      schedule: { every: built.every, lookback: built.lookback },
      query: {
        format: 'standalone',
        breach: { query: built.query },
      },
      recovery_strategy: built.recoveryStrategy,
      no_data_strategy: built.noDataStrategy,
      ...(built.groupingFields.length > 0 ? { grouping: { fields: built.groupingFields } } : {}),
    };
    const created = await rulesClient.createRule({ data });
    return toSummary(created);
  },
});

export const deleteRumAlertRoute = createUxServerRoute({
  endpoint: 'DELETE /internal/ux/rum/alerts/{id}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ path: t.type({ id: boundedString(128) }) }),
  handler: async (resources): Promise<{ ok: true }> => {
    const alerting = await requireAlerting(resources);
    const rulesClient = await alerting.getRulesClientWithRequest(resources.request);
    await rulesClient.deleteRule({ id: resources.params.path.id });
    return { ok: true };
  },
});

export const enableRumAlertRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/alerts/{id}/_enable',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ path: t.type({ id: boundedString(128) }) }),
  handler: async (resources): Promise<RumAlertRuleSummary> => {
    const alerting = await requireAlerting(resources);
    const rulesClient = await alerting.getRulesClientWithRequest(resources.request);
    const rule = await rulesClient.enableRule({ id: resources.params.path.id });
    return toSummary(rule);
  },
});

export const disableRumAlertRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/alerts/{id}/_disable',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ path: t.type({ id: boundedString(128) }) }),
  handler: async (resources): Promise<RumAlertRuleSummary> => {
    const alerting = await requireAlerting(resources);
    const rulesClient = await alerting.getRulesClientWithRequest(resources.request);
    const rule = await rulesClient.disableRule({ id: resources.params.path.id });
    return toSummary(rule);
  },
});

export const upsertRumAlertNotificationsRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/alerts/_notifications',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: notificationsBodyCodec }),
  handler: async (
    resources
  ): Promise<{ workflowId: string; policyId: string; connectorId: string; to: string[] }> => {
    const { connectorId, to: rawTo } = resources.params.body;
    const to = rawTo.flatMap((value) => parseRecipientList(value)).slice(0, 20);
    if (to.length === 0) {
      throw new Error('At least one recipient is required');
    }
    if (!resources.workflowsManagement) {
      throw new Error('Workflows are not available');
    }
    const alerting = await requireAlerting(resources);
    const spaceId = await spaceIdOf(resources);
    const yaml = buildRumEmailWorkflowYaml(connectorId, to);
    const { savedObjects } = await resources.context.core;
    let existing: RumAlertNotificationsAttributes | undefined;
    try {
      const so = await savedObjects.client.get<RumAlertNotificationsAttributes>(
        RUM_ALERT_NOTIFICATIONS_SO_TYPE,
        RUM_ALERT_NOTIFICATIONS_SO_ID
      );
      existing = so.attributes;
    } catch {
      existing = undefined;
    }

    let workflowId = existing?.workflowId;
    const workflows = resources.workflowsManagement.management;
    if (workflowId) {
      const current = await workflows.getWorkflow(workflowId, spaceId);
      if (current) {
        await workflows.updateWorkflow(workflowId, { yaml }, spaceId, resources.request);
      } else {
        workflowId = undefined;
      }
    }
    if (!workflowId) {
      const created = await workflows.createWorkflow({ yaml }, spaceId, resources.request);
      workflowId = created.id;
    }

    const policyClient = await alerting.getActionPolicyClientWithRequest(resources.request);
    let policyId = existing?.policyId;
    const policyData = {
      name: 'UX RUM email',
      description: 'Emails when a User Experience RUM alert fires',
      destinations: [{ type: 'workflow' as const, id: workflowId }],
      matcher: `rule.tags: "${RUM_ALERT_TAG}"`,
      groupingMode: 'per_episode' as const,
      throttle: { strategy: 'on_status_change' as const, interval: null },
      tags: [RUM_ALERT_TAG],
    };
    if (policyId) {
      try {
        const current = await policyClient.getActionPolicy({ id: policyId });
        await policyClient.updateActionPolicy({
          data: policyData,
          options: { id: policyId, version: current.version ?? '1' },
        });
      } catch {
        policyId = undefined;
      }
    }
    if (!policyId) {
      const created = await policyClient.createActionPolicy({ data: policyData });
      policyId = created.id;
    }

    const attributes: RumAlertNotificationsAttributes = {
      workflowId,
      policyId,
      connectorId,
      to,
      updatedAt: new Date().toISOString(),
    };
    await savedObjects.client.update<RumAlertNotificationsAttributes>(
      RUM_ALERT_NOTIFICATIONS_SO_TYPE,
      RUM_ALERT_NOTIFICATIONS_SO_ID,
      attributes,
      { upsert: attributes }
    );
    return { workflowId, policyId, connectorId, to };
  },
});

const generateBodyCodec = t.intersection([
  t.type({ prompt: boundedString(2000) }),
  t.partial({
    connectorId: boundedString(128),
    filters: filtersCodec,
  }),
]);

export const generateRumAlertEsqlRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/alerts/_generate',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: generateBodyCodec }),
  handler: async (resources): Promise<{ query: string; description: string }> => {
    const plugins = await resources.startPlugins();
    if (!plugins.inference) {
      throw new Error('Inference is not available');
    }
    const { prompt, connectorId, filters } = resources.params.body;
    const connector = connectorId
      ? await plugins.inference.getConnectorById(connectorId, resources.request)
      : await plugins.inference.getDefaultConnector(resources.request);
    if (!connector) {
      throw new Error('No GenAI connector is configured');
    }
    const filterLines = [
      filters?.serviceName ? `service: ${filters.serviceName}` : null,
      filters?.pageUrl ? `page: ${filters.pageUrl}` : null,
      filters?.browser ? `browser: ${filters.browser}` : null,
      filters?.location ? `country: ${filters.location}` : null,
    ].filter(Boolean);
    const client = plugins.inference.getClient({ request: resources.request });
    const response = await client.chatComplete({
      connectorId: connector.connectorId,
      system: RUM_ALERT_AI_SYSTEM_PROMPT,
      messages: [
        {
          role: MessageRole.User,
          content: [
            'Write a RUM alert breach query for:',
            prompt.trim(),
            filterLines.length > 0 ? `Filters: ${filterLines.join(', ')}` : 'Filters: none',
            'If this is an investigation (why, a weekday, a page), convert it to a threshold on that symptom. Do not filter by weekday. FROM on its own line.',
          ].join('\n'),
        },
      ],
    });
    const extracted = extractRumAlertEsqlFromLlm(response.content?.trim() ?? '');
    const query = assertRumAlertEsql(extracted.query);
    return {
      query,
      description: (extracted.description || prompt.trim()).slice(0, 300),
    };
  },
});

const previewBodyCodec = t.intersection([
  t.type({ query: boundedString(8000) }),
  t.partial({ lookback: boundedString(16) }),
]);

export interface RumAlertPreviewResult {
  columns: Array<{ name: string; type: string }>;
  rows: unknown[][];
  wouldFire: boolean;
  chartQuery: string;
  error?: string;
}

const runRumEsql = async (
  resources: UxRouteHandlerResources,
  query: string
): Promise<{ columns: Array<{ name: string; type: string }>; rows: unknown[][] }> => {
  const client = await getRumSearchClient(resources);
  const result = await withRumEsRetry(() => client.esql.query({ query }, rumEsSearchOptions));
  return {
    columns: (result.columns ?? []).map((column) => ({
      name: column.name,
      type: String(column.type ?? ''),
    })),
    rows: (result.values ?? []) as unknown[][],
  };
};

export const previewRumAlertEsqlRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/alerts/_preview',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: previewBodyCodec }),
  handler: async (resources): Promise<RumAlertPreviewResult> => {
    const query = assertRumAlertEsql(resources.params.body.query);
    if (isPlaceholderRumAlertEsql(query)) {
      return { columns: [], rows: [], wouldFire: false, chartQuery: query };
    }
    const lookback = resources.params.body.lookback || '15m';
    const { elasticsearch } = await resources.context.core;
    const analytics =
      rumAlertTimeField(query) === 'start_time'
        ? await getRumAnalyticsStatus(elasticsearch.client.asInternalUser)
        : undefined;
    const watermark = analytics?.watermark ?? undefined;
    const chartQuery = injectLookbackAfterFrom(stripFinalWhere(query), lookback, { watermark });
    const breachQuery = injectLookbackAfterFrom(query, lookback, { watermark });
    try {
      const chart = await runRumEsql(resources, `${chartQuery}\n| LIMIT 25`);
      let wouldFire = chart.rows.length > 0;
      if (stripFinalWhere(query) !== query) {
        try {
          const breach = await runRumEsql(resources, `${breachQuery}\n| LIMIT 5`);
          wouldFire = breach.rows.length > 0;
        } catch {
          wouldFire = false;
        }
      }
      return { ...chart, wouldFire, chartQuery };
    } catch (error) {
      return {
        columns: [],
        rows: [],
        wouldFire: false,
        chartQuery,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

const loadEpisodes = async (
  resources: UxRouteHandlerResources,
  ruleIds: string[]
): Promise<RumAlertEpisodeSummary[]> => {
  if (ruleIds.length === 0) {
    return [];
  }
  const { elasticsearch } = await resources.context.core;
  const quoted = ruleIds
    .slice(0, 50)
    .map((id) => `"${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(', ');
  const query = `FROM ${ALERT_EVENTS_DATA_STREAM}
| WHERE \`rule.id\` IN (${quoted})
| KEEP @timestamp, \`episode.id\`, \`episode.status\`, \`rule.id\`, group_hash
| SORT @timestamp DESC
| LIMIT 200`;
  try {
    const result = await elasticsearch.client.asCurrentUser.esql.query({ query });
    const columns = result.columns ?? [];
    const indexOf = (name: string) => columns.findIndex((column) => column.name === name);
    const ts = indexOf('@timestamp');
    const episodeId = indexOf('episode.id');
    const status = indexOf('episode.status');
    const ruleId = indexOf('rule.id');
    const groupHash = indexOf('group_hash');
    return (result.values ?? []).map((row) => ({
      timestamp: String(row[ts] ?? ''),
      episodeId: episodeId >= 0 ? String(row[episodeId] ?? '') : undefined,
      status: status >= 0 ? String(row[status] ?? '') : undefined,
      ruleId: ruleId >= 0 ? String(row[ruleId] ?? '') : undefined,
      groupHash: groupHash >= 0 ? String(row[groupHash] ?? '') : undefined,
    }));
  } catch {
    return [];
  }
};
