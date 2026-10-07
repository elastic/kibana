/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AgentBuilderPluginSetup,
  BuiltinToolDefinition,
  ToolAvailabilityConfig,
} from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ONBOARDING_CONNECTOR_TYPE_ID } from '../../common/onboarding';

export const ONBOARDING_ESQL_TOOL_ID = 'nightshift_onboarding_esql';
export const ONBOARDING_LIST_INDICES_TOOL_ID = 'nightshift_onboarding_list_indices';
export const ONBOARDING_KIBANA_GET_TOOL_ID = 'nightshift_onboarding_kibana_get';

export const ONBOARDING_TOOL_IDS = [
  ONBOARDING_ESQL_TOOL_ID,
  ONBOARDING_LIST_INDICES_TOOL_ID,
  ONBOARDING_KIBANA_GET_TOOL_ID,
] as const;

/** Tool results are truncated to keep a dozen calls well inside the model context. */
const MAX_RESULT_CHARS = 12_000;

const connectorIdField = z
  .string()
  .min(1)
  .max(256)
  .describe('Id of the connected deployment (External Elasticsearch connector) to query.');

const esqlSchema = z.object({
  connector_id: connectorIdField,
  query: z
    .string()
    .min(1)
    .max(10_000)
    .describe(
      'ES|QL query, e.g. FROM logs-* | WHERE @timestamp > NOW() - 1 hour | STATS c = COUNT(*) BY service.name | SORT c DESC | LIMIT 10'
    ),
});

const listIndicesSchema = z.object({
  connector_id: connectorIdField,
  pattern: z
    .string()
    .max(512)
    .default('*')
    .describe('Index / data stream pattern, e.g. "logs-*" or ".alerts-*".'),
  includeHidden: z
    .boolean()
    .default(false)
    .describe('Include hidden indices (needed for ".alerts-*").'),
});

const kibanaGetSchema = z.object({
  connector_id: connectorIdField,
  path: z
    .string()
    .min(1)
    .max(2048)
    .regex(/^\//, 'Path must start with "/".')
    .describe('Kibana API path, e.g. /api/alerting/rules/_find or /api/observability/slos'),
  queryParams: z
    .record(z.string().max(200), z.union([z.string().max(2048), z.number(), z.boolean()]))
    .optional()
    .describe('Query string parameters, e.g. { "per_page": 20 }'),
});

const truncate = (data: unknown): unknown => {
  const json = JSON.stringify(data);
  if (json === undefined || json.length <= MAX_RESULT_CHARS) return data;
  return {
    truncated: true,
    note: `Result truncated to ${MAX_RESULT_CHARS} characters; narrow the query (STATS, LIMIT, fewer fields).`,
    partial: json.slice(0, MAX_RESULT_CHARS),
  };
};

interface OnboardingToolDeps {
  getActions: () => ActionsPluginStart | undefined;
  availability: ToolAvailabilityConfig;
}

const executeOnConnector = async (
  { getActions }: OnboardingToolDeps,
  request: KibanaRequest,
  connectorId: string,
  subAction: string,
  subActionParams: Record<string, unknown>
) => {
  const actions = getActions();
  if (!actions) {
    return { results: [createErrorResult({ message: 'Connectors are not available.' })] };
  }
  const actionsClient = await actions.getActionsClientWithRequest(request);
  let actionTypeId: string;
  try {
    ({ actionTypeId } = await actionsClient.get({ id: connectorId }));
  } catch (error) {
    return {
      results: [createErrorResult({ message: `Connector '${connectorId}' was not found.` })],
    };
  }
  if (actionTypeId !== ONBOARDING_CONNECTOR_TYPE_ID) {
    return {
      results: [
        createErrorResult({
          message: `Connector '${connectorId}' is not an External Elasticsearch connector.`,
        }),
      ],
    };
  }
  const result = await actionsClient.execute({
    actionId: connectorId,
    params: { subAction, subActionParams },
  });
  if (result.status === 'error') {
    return {
      results: [
        createErrorResult({
          message: result.serviceMessage ?? result.message ?? `${subAction} failed`,
        }),
      ],
    };
  }
  return { results: [{ type: ToolResultType.other, data: truncate(result.data) as object }] };
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

/** Registers the read-only tools the onboarding agent explores the connected deployment with. */
export const registerOnboardingTools = (
  tools: Pick<AgentBuilderPluginSetup['tools'], 'register'>,
  deps: OnboardingToolDeps
): void => {
  const esqlTool: BuiltinToolDefinition<typeof esqlSchema> = {
    id: ONBOARDING_ESQL_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Run an ES|QL query against a deployment the user connected during Nightshift onboarding. Prefer STATS aggregations and always bound by @timestamp and LIMIT.',
    schema: esqlSchema,
    availability: deps.availability,
    tags: ['nightshift', 'onboarding'],
    excludeFromMcp: true,
    annotations: { ...annotations, title: 'Nightshift onboarding: ES|QL' },
    handler: async ({ connector_id: connectorId, query }, { request }) =>
      executeOnConnector(deps, request, connectorId, 'esql', { query }),
  };
  const listIndicesTool: BuiltinToolDefinition<typeof listIndicesSchema> = {
    id: ONBOARDING_LIST_INDICES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'List indices and data streams (with doc count and size) on a deployment the user connected during Nightshift onboarding.',
    schema: listIndicesSchema,
    availability: deps.availability,
    tags: ['nightshift', 'onboarding'],
    excludeFromMcp: true,
    annotations: { ...annotations, title: 'Nightshift onboarding: list indices' },
    handler: async ({ connector_id: connectorId, pattern, includeHidden }, { request }) => {
      const listed = await executeOnConnector(deps, request, connectorId, 'listIndices', {
        pattern,
        includeHidden,
      });
      if (listed.results[0]?.type !== ToolResultType.error) {
        return listed;
      }
      // _cat/indices needs the `monitor` privilege, which read-only keys often lack. Counting
      // documents per index through ES|QL only needs `read`.
      return executeOnConnector(deps, request, connectorId, 'esql', {
        query: `FROM ${pattern} METADATA _index | STATS docs = COUNT(*) BY _index | SORT docs DESC | LIMIT 50`,
      });
    },
  };
  const kibanaGetTool: BuiltinToolDefinition<typeof kibanaGetSchema> = {
    id: ONBOARDING_KIBANA_GET_TOOL_ID,
    type: ToolType.builtin,
    description:
      'GET request against the Kibana HTTP API of the deployment the user connected during Nightshift onboarding (rules, SLOs, cases). Fails when the connection has no Kibana URL.',
    schema: kibanaGetSchema,
    availability: deps.availability,
    tags: ['nightshift', 'onboarding'],
    excludeFromMcp: true,
    annotations: { ...annotations, title: 'Nightshift onboarding: Kibana GET' },
    handler: async ({ connector_id: connectorId, path, queryParams }, { request }) =>
      executeOnConnector(deps, request, connectorId, 'kibanaRequest', { path, queryParams }),
  };
  tools.register(esqlTool);
  tools.register(listIndicesTool);
  tools.register(kibanaGetTool);
};
