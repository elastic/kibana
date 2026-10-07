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
import { getConnectorSpec, isToolAction, type ConnectorSpec } from '@kbn/connector-specs';
import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import {
  ONBOARDING_CONNECTOR_TYPE_ID,
  MAX_ONBOARDING_CONNECTORS,
  isOnboardingConnectorTypeId,
} from '../../common/onboarding';

export const ONBOARDING_ESQL_TOOL_ID = 'nightshift_onboarding_esql';
export const ONBOARDING_LIST_INDICES_TOOL_ID = 'nightshift_onboarding_list_indices';
export const ONBOARDING_KIBANA_GET_TOOL_ID = 'nightshift_onboarding_kibana_get';
export const ONBOARDING_DESCRIBE_CONNECTORS_TOOL_ID = 'nightshift_onboarding_describe_connectors';
export const ONBOARDING_CALL_CONNECTOR_TOOL_ID = 'nightshift_onboarding_call_connector';

export const ONBOARDING_TOOL_IDS = [
  ONBOARDING_ESQL_TOOL_ID,
  ONBOARDING_LIST_INDICES_TOOL_ID,
  ONBOARDING_KIBANA_GET_TOOL_ID,
  ONBOARDING_DESCRIBE_CONNECTORS_TOOL_ID,
  ONBOARDING_CALL_CONNECTOR_TOOL_ID,
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

const describeConnectorsSchema = z.object({
  connector_ids: z
    .array(z.string().min(1).max(256))
    .min(1)
    .max(MAX_ONBOARDING_CONNECTORS)
    .describe('Ids of the connected tools to describe.'),
});

const callConnectorSchema = z.object({
  connector_id: connectorIdField,
  sub_action: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'Read-only sub-action name, exactly as listed by nightshift_onboarding_describe_connectors.'
    ),
  params: z
    .record(z.string().max(200), z.unknown())
    .optional()
    .describe('Arguments of the sub-action.'),
});

/** Read-only, agent-callable sub-actions of a connector spec. */
const getReadOnlyActions = (spec: ConnectorSpec) =>
  Object.entries(spec.actions).filter(
    ([name, action]) => isToolAction(spec, name) && action.scope === 'read'
  );

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
  subActionParams: Record<string, unknown>,
  isAllowedType: (actionTypeId: string) => boolean = (typeId) =>
    typeId === ONBOARDING_CONNECTOR_TYPE_ID
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
  if (!isAllowedType(actionTypeId)) {
    return {
      results: [
        createErrorResult({
          message: `Connector '${connectorId}' (${actionTypeId}) cannot be used with this tool.`,
        }),
      ],
    };
  }
  if (actionTypeId !== ONBOARDING_CONNECTOR_TYPE_ID) {
    const spec = getConnectorSpec(actionTypeId);
    const isReadOnly = spec ? getReadOnlyActions(spec).some(([name]) => name === subAction) : false;
    if (!isReadOnly) {
      return {
        results: [
          createErrorResult({
            message: `Sub-action '${subAction}' is not a read-only action of connector '${connectorId}'. Call ${ONBOARDING_DESCRIBE_CONNECTORS_TOOL_ID} to list them.`,
          }),
        ],
      };
    }
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
  const describeConnectorsTool: BuiltinToolDefinition<typeof describeConnectorsSchema> = {
    id: ONBOARDING_DESCRIBE_CONNECTORS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Describe the tools (Elastic deployments, Slack, GitHub, ...) the user connected during Nightshift onboarding: their type and the read-only sub-actions you can call with nightshift_onboarding_call_connector. Call this first.',
    schema: describeConnectorsSchema,
    availability: deps.availability,
    tags: ['nightshift', 'onboarding'],
    excludeFromMcp: true,
    annotations: { ...annotations, title: 'Nightshift onboarding: describe connected tools' },
    handler: async ({ connector_ids: connectorIds }, { request }) => {
      const actions = deps.getActions();
      if (!actions) {
        return { results: [createErrorResult({ message: 'Connectors are not available.' })] };
      }
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const sections = await Promise.all(
        connectorIds.map(async (connectorId) => {
          try {
            const connector = await actionsClient.get({ id: connectorId });
            if (!isOnboardingConnectorTypeId(connector.actionTypeId)) {
              return `## ${connectorId}\nNot usable during onboarding (${connector.actionTypeId}).`;
            }
            if (connector.actionTypeId === ONBOARDING_CONNECTOR_TYPE_ID) {
              return [
                `## ${connector.name} (connector_id: ${connectorId}, type: Elastic deployment)`,
                `Use ${ONBOARDING_LIST_INDICES_TOOL_ID}, ${ONBOARDING_ESQL_TOOL_ID} and ${ONBOARDING_KIBANA_GET_TOOL_ID}.`,
                connector.config?.kibanaUrl
                  ? 'Kibana URL configured.'
                  : 'No Kibana URL configured.',
              ].join('\n');
            }
            const spec = getConnectorSpec(connector.actionTypeId);
            const readOnly = spec ? getReadOnlyActions(spec) : [];
            return [
              `## ${connector.name} (connector_id: ${connectorId}, type: ${
                spec?.metadata.displayName ?? connector.actionTypeId
              })`,
              `Call ${ONBOARDING_CALL_CONNECTOR_TOOL_ID} with one of these read-only sub-actions:`,
              ...readOnly.map(([name, action]) =>
                [
                  `- ${name}: ${action.description ?? ''}`,
                  action.input ? formatSchemaForLlm(action.input).replace(/^/gm, '    ') : '',
                ]
                  .filter(Boolean)
                  .join('\n')
              ),
            ].join('\n');
          } catch (error) {
            return `## ${connectorId}\nCould not be read: ${error.message}`;
          }
        })
      );
      return {
        results: [{ type: ToolResultType.other, data: { connectors: sections.join('\n\n') } }],
      };
    },
  };
  const callConnectorTool: BuiltinToolDefinition<typeof callConnectorSchema> = {
    id: ONBOARDING_CALL_CONNECTOR_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Call a read-only sub-action of a tool connected during Nightshift onboarding (for example Slack searchMessages or GitHub searchIssues). List the sub-actions with nightshift_onboarding_describe_connectors first.',
    schema: callConnectorSchema,
    availability: deps.availability,
    tags: ['nightshift', 'onboarding'],
    excludeFromMcp: true,
    annotations: { ...annotations, title: 'Nightshift onboarding: call connected tool' },
    handler: async ({ connector_id: connectorId, sub_action: subAction, params }, { request }) =>
      executeOnConnector(
        deps,
        request,
        connectorId,
        subAction,
        params ?? {},
        (typeId) => isOnboardingConnectorTypeId(typeId) && typeId !== ONBOARDING_CONNECTOR_TYPE_ID
      ),
  };
  tools.register(describeConnectorsTool);
  tools.register(callConnectorTool);
  tools.register(esqlTool);
  tools.register(listIndicesTool);
  tools.register(kibanaGetTool);
};
