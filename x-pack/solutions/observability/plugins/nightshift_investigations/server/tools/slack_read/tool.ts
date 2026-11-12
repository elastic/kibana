/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { asAgentBuilderExecutionSource } from '@kbn/actions-plugin/server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, resolveAllowedConnectorIds } from '@kbn/agent-builder-server';
import {
  connectorsSpecs,
  isSelectedActionEnabled,
  type SelectedActions,
} from '@kbn/connector-specs';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../../common';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from '../../lib/automations/generate_workflow_yaml';
import type { ActionsClient } from '../sandbox_bash/agent_connectors';

export const SLACK_READ_TOOL_ID = 'platform.nightshift.slack_read';

const NIGHTSHIFT_AGENT_IDS: readonly string[] = [
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
];

const SLACK_READ_SUB_ACTIONS = [
  'listChannels',
  'getConversationHistory',
  'getConversationReplies',
] as const;

const MAX_CONNECTOR_ID_LENGTH = 255;

const slackReadSchema = lazySchema(() =>
  z.object({
    connectorId: z
      .string()
      .min(1)
      .max(MAX_CONNECTOR_ID_LENGTH)
      .optional()
      .describe(
        `Id of a Slack connector assigned to this agent. Omit it to use the Elastic Slack app (${ELASTIC_APPS_SLACK_CONNECTOR_ID}), or the only assigned Slack connector.`
      ),
    subAction: z.enum(SLACK_READ_SUB_ACTIONS).describe('The Slack read to run.'),
    // The Slack connector validates these against the sub-action's own input schema.
    params: z
      .looseObject({})
      .default({})
      .describe('Parameters of the sub-action, as listed in the tool description.'),
  })
);

const errorResult = (message: string, metadata: Record<string, string | undefined>) => ({
  results: [createErrorResult({ message, metadata })],
});

/** Converts a Slack message `ts` (epoch seconds with a sequence suffix) to an ISO 8601 UTC time. */
export const slackTsToIso = (ts: string): string | undefined => {
  const seconds = Number(ts);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(Math.floor(seconds * 1000)).toISOString()
    : undefined;
};

interface SlackReadData {
  messages?: Array<{ ts?: string }>;
}

const withMessageTimes = (data: SlackReadData): SlackReadData =>
  Array.isArray(data.messages)
    ? {
        ...data,
        messages: data.messages.map((message) => {
          const time = typeof message.ts === 'string' ? slackTsToIso(message.ts) : undefined;
          return time ? { ...message, time } : message;
        }),
      }
    : data;

type SlackConnector = Awaited<ReturnType<ActionsClient['get']>>;

const resolveSlackConnector = ({
  connectors,
  connectorId,
}: {
  connectors: SlackConnector[];
  connectorId?: string;
}): SlackConnector | { errorMessage: string } => {
  const assignedIds = connectors.map(({ id }) => `'${id}'`).join(', ');
  if (connectorId) {
    const connector = connectors.find(({ id }) => id === connectorId);
    if (connector) return connector;
    return {
      errorMessage: connectors.length
        ? `Connector '${connectorId}' is not a Slack connector assigned to this agent. Use one of: ${assignedIds}.`
        : `Connector '${connectorId}' is not a Slack connector assigned to this agent, and none is. Carry on without Slack.`,
    };
  }
  const connector =
    connectors.find(({ id }) => id === ELASTIC_APPS_SLACK_CONNECTOR_ID) ??
    (connectors.length === 1 ? connectors[0] : undefined);
  if (connector) return connector;
  return {
    errorMessage: connectors.length
      ? `Several Slack connectors are assigned to this agent. Pass connectorId, one of: ${assignedIds}.`
      : 'No Slack connector is assigned to this agent, so Slack is not connected. Carry on without Slack.',
  };
};

/** Creates the tool that runs read-only sub-actions on the Slack connectors assigned to a Nightshift agent. */
export const createSlackReadTool = ({
  getActions,
}: {
  getActions: () => ActionsPluginStart | undefined;
}): BuiltinToolDefinition<typeof slackReadSchema> => ({
  id: SLACK_READ_TOOL_ID,
  type: ToolType.builtin,
  description: `Read Slack through a Slack connector assigned to this agent. It can only read: it cannot post, edit or react.

Sub-actions:
- listChannels: the channels the connector can see, with their ids. Params: types, excludeArchived, limit, cursor.
- getConversationHistory: messages in a channel, newest first. Params: channel (required), oldest, latest, inclusive, limit, cursor.
- getConversationReplies: a thread, parent message first. Params: channel and ts of the parent (both required), oldest, latest, inclusive, limit, cursor.

Each message has its Slack ts, which identifies it and opens its thread, and its time in ISO 8601 UTC.
When a result has hasMore true, call again with its nextCursor to read the next page. A result lists otherSlackConnectorIds when more Slack connectors are assigned; pass one as connectorId to read its channels too. On the Elastic Slack app, a result with "ok": false explains why the read failed, for example a channel it cannot read; on other Slack connectors a failed read comes back as an error.`,
  tags: ['investigation', 'slack'],
  schema: slackReadSchema,
  annotations: {
    title: 'Read Slack',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  excludeFromMcp: true,
  handler: async ({ connectorId, subAction, params }, context) => {
    const actions = getActions();
    if (!actions) {
      return errorResult('Connectors are not available in this deployment.', {
        connectorId,
        subAction,
      });
    }
    const actionsClient = await actions.getActionsClientWithRequest(context.request);
    const allowedIds = resolveAllowedConnectorIds(context.agentConfiguration);
    const agentId = context.runContext?.stack.findLast((entry) => entry.type === 'agent')?.agentId;
    // The Elastic Slack app is Nightshift's own connector, so the Nightshift agents read it
    // without it being assigned; every other agent stays scoped to its `connector_ids`.
    const candidateIds = [
      ...new Set([
        ...(agentId && NIGHTSHIFT_AGENT_IDS.includes(agentId)
          ? [ELASTIC_APPS_SLACK_CONNECTOR_ID]
          : []),
        ...(allowedIds ?? []),
      ]),
    ];
    let candidates: SlackConnector[];
    if (allowedIds) {
      const lookups = await Promise.allSettled(candidateIds.map((id) => actionsClient.get({ id })));
      // A connector that does not exist, such as the app before it is connected, drops out.
      const failed = lookups.find(
        (lookup): lookup is PromiseRejectedResult =>
          lookup.status === 'rejected' && !SavedObjectsErrorHelpers.isNotFoundError(lookup.reason)
      );
      if (failed) {
        return errorResult(`Failed to look up the Slack connectors: ${failed.reason.message}`, {
          connectorId,
          subAction,
        });
      }
      candidates = lookups.flatMap((lookup) =>
        lookup.status === 'fulfilled' ? [lookup.value] : []
      );
    } else {
      candidates = await actionsClient.getAll();
    }
    const slackConnectors = candidates.filter(
      ({ actionTypeId }) => actionTypeId === connectorsSpecs.Slack.metadata.id
    );
    const connector = resolveSlackConnector({ connectors: slackConnectors, connectorId });
    if ('errorMessage' in connector) {
      return errorResult(connector.errorMessage, { connectorId, subAction });
    }

    const { id } = connector;
    const metadata = { connectorId: id, subAction };
    const otherSlackConnectorIds = slackConnectors
      .filter((other) => other.id !== id)
      .map((other) => other.id);
    const otherConnectorsHint = otherSlackConnectorIds.length
      ? ` Other Slack connectors you can read: ${otherSlackConnectorIds
          .map((other) => `'${other}'`)
          .join(', ')}.`
      : '';
    const selectedActions = connector.config?.selectedActions as SelectedActions;
    if (!isSelectedActionEnabled(subAction, selectedActions)) {
      return errorResult(
        `Sub-action '${subAction}' is disabled on connector '${id}'.${otherConnectorsHint}`,
        metadata
      );
    }

    const result = await actionsClient.execute({
      actionId: id,
      params: { subAction, subActionParams: params },
      source: asAgentBuilderExecutionSource({ toolId: context.callContext.toolId }),
    });
    if (result.status === 'error') {
      return errorResult(
        `Slack ${subAction} failed on connector '${id}': ${
          result.serviceMessage ?? result.message ?? 'unknown error'
        }.${otherConnectorsHint}`,
        metadata
      );
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            ...withMessageTimes((result.data ?? {}) as SlackReadData),
            connectorId: id,
            ...(otherSlackConnectorIds.length ? { otherSlackConnectorIds } : {}),
          },
        },
      ],
    };
  },
});
