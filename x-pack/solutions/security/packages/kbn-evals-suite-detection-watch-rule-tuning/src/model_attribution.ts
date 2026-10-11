/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { GEN_AI_DEFAULT_CONNECTOR_SETTING } from './constants';
import { extractConversationId, toolSpanJoinClauses } from './evaluators/tool_routing';
import type { RuleTuningVerdict } from './workflow_task';

/**
 * The slice of `kbnClient` this module needs, declared structurally so the
 * module stays unit-testable and the suite needs no `@kbn/kbn-client` dependency
 * (the real client is `KbnClient` from `@kbn/kbn-client`).
 */
export interface ConnectorPinClient {
  uiSettings: {
    update: (
      values: Record<string, string | number | boolean | string[]>,
      options?: { space?: string }
    ) => Promise<unknown>;
    get: (setting: string, options?: { space?: string }) => Promise<unknown>;
    waitForEventualCacheRefresh: () => Promise<void>;
  };
}

/** A connector as the eval harness hands it to specs (`AvailableConnectorWithId`). */
export interface ConnectorLike {
  id?: string;
  name?: string;
  config?: unknown;
  /** Flat inference-endpoint definitions (EIS/OpenRouter) carry this at the top level, not under `config`. */
  providerConfig?: unknown;
  /** Flat inference-endpoint definitions also carry the endpoint's inference id (`.<model>-chat_completion`). */
  inferenceId?: string;
}

/**
 * The model id the eval framework stamps into `task_model.id` for this
 * connector.
 *
 * Mirrors `buildModelFromConnector` (@kbn/evals) over `getConnectorModel`
 * (@kbn/inference-common): the inference-endpoint shape carries
 * `config.providerConfig.model_id`, the OpenAI/Gemini/Bedrock shapes carry
 * `config.defaultModel`, and a connector that answers neither falls back to its
 * name. It is duplicated rather than imported because neither helper is part of
 * `@kbn/evals`' public API — keep it in step with `get_connector_model.ts`.
 *
 * The eval fixture binds EIS to a flat inference-endpoint definition
 * (`providerConfig.model_id` at the top level, no `config`); without reading that
 * shape the id falls back to the connector name (`eis-…`) and never matches the
 * spans' `gen_ai.request.model` (`anthropic-…`).
 */
const EIS_INFERENCE_ID = /^\.(.+)-chat_completion$/;

/** `.anthropic-claude-5-sonnet-chat_completion` → `anthropic-claude-5-sonnet`. */
const modelFromInferenceId = (inferenceId: unknown): string | undefined =>
  typeof inferenceId === 'string' ? EIS_INFERENCE_ID.exec(inferenceId)?.[1] : undefined;

export const expectedModelId = (connector: ConnectorLike): string => {
  const config = (connector.config ?? {}) as {
    providerConfig?: { model_id?: string };
    defaultModel?: string;
  };
  const endpointModelId = (connector.providerConfig as { model_id?: unknown } | undefined)
    ?.model_id;
  return (
    (typeof endpointModelId === 'string' ? endpointModelId : undefined) ??
    config.providerConfig?.model_id ??
    config.defaultModel ??
    // Endpoint definitions without `providerConfig.model_id` (the controller-generated EIS map)
    // still name the model in their inference id, which is what the workflow actually calls.
    modelFromInferenceId(connector.inferenceId) ??
    modelFromInferenceId(connector.id) ??
    connector.name ??
    ''
  );
};

/** Model ids differ in separators/case across the stack (`.` vs `-`, `_`); the model does not. */
const normalizeModelId = (model: string): string =>
  model
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Point the space-default AI connector at the eval's own connector.
 *
 * The review's `diagnose_rule` step is an `ai.agent` step whose manual-trigger
 * schema rejects extra inputs, so the connector cannot be pinned per run: the
 * step resolves `genAiSettings:defaultAIConnector` server-side
 * (`resolve_selected_connector_id.ts`). Without this pin the workflow runs the
 * stack's own default connector while the eval stamps `task_model` with the
 * `--model` connector — every score doc then attributes the numbers to a model
 * the workflow never called.
 *
 * The read-back is the assertion: a pin that silently did not stick would leave
 * exactly the mismatch this exists to prevent.
 */
export const pinWorkflowConnector = async ({
  kbnClient,
  connector,
  log,
  space,
}: {
  kbnClient: ConnectorPinClient;
  connector: ConnectorLike;
  log: ToolingLog;
  space?: string;
}): Promise<string> => {
  if (!connector.id) {
    throw new Error(
      `Cannot pin ${GEN_AI_DEFAULT_CONNECTOR_SETTING}: the eval connector fixture has no id ` +
        `(name: ${connector.name ?? 'unknown'}). The workflow would run the stack default while ` +
        `the score docs name this connector's model.`
    );
  }

  await kbnClient.uiSettings.update(
    { [GEN_AI_DEFAULT_CONNECTOR_SETTING]: connector.id },
    { space }
  );
  // A multi-node deployment can serve the workflow from a node whose uiSettings
  // cache has not expired yet (elastic/kibana#265720).
  await kbnClient.uiSettings.waitForEventualCacheRefresh();

  const pinned = await kbnClient.uiSettings.get(GEN_AI_DEFAULT_CONNECTOR_SETTING, { space });
  if (pinned !== connector.id) {
    throw new Error(
      `${GEN_AI_DEFAULT_CONNECTOR_SETTING} did not stick: expected "${connector.id}", the stack ` +
        `reports "${String(pinned)}". Every score doc of this run would name ` +
        `"${expectedModelId(connector)}" while the workflow's ai.agent step calls whatever ` +
        `connector that setting resolves to.`
    );
  }

  log.info(
    `${GEN_AI_DEFAULT_CONNECTOR_SETTING} pinned to ${connector.id} (model ${expectedModelId(
      connector
    )}) — the workflow's ai.agent step now runs the model this run is stamped with`
  );
  return pinned;
};

interface ChatModelCount {
  model: string;
  chats: number;
}

const countChatModels = async (
  traceEsClient: EsClient,
  where: string
): Promise<ChatModelCount[]> => {
  const response = (await traceEsClient.esql.query({
    query: `FROM traces-*\n| WHERE ${where} AND attributes.gen_ai.operation.name == "chat"\n| STATS chats = COUNT(*) BY model = attributes.gen_ai.request.model`,
  })) as unknown as { columns?: Array<{ name: string }>; values?: unknown[][] };

  const columns = response.columns ?? [];
  const modelIdx = columns.findIndex((column) => column.name === 'model');
  const chatsIdx = columns.findIndex((column) => column.name === 'chats');
  if (modelIdx === -1 || chatsIdx === -1) {
    return [];
  }

  return (response.values ?? []).map((row) => ({
    model: String(row[modelIdx] ?? ''),
    chats: Number(row[chatsIdx] ?? 0),
  }));
};

const describeModels = (counts: ChatModelCount[]): string =>
  counts.map(({ model, chats }) => `${model} (${chats} chat span(s))`).join(', ') || 'none';

/**
 * Assert the probe run's chat spans were produced by the model this run is
 * stamped with, on the same join keys the trace evaluators score with.
 *
 * This is the half of the model-attribution defect a pin alone cannot prove: it
 * reads the model back off the run's own spans, so a stamp that does not match
 * the trace fails here instead of in a matrix row months later.
 */
export const assertWorkflowModelMatches = async ({
  traceEsClient,
  probe,
  connector,
  log,
}: {
  traceEsClient: EsClient;
  probe: RuleTuningVerdict;
  connector: ConnectorLike;
  log: ToolingLog;
}): Promise<string> => {
  const expected = expectedModelId(connector);
  if (!expected) {
    throw new Error(
      'Cannot verify model attribution: the eval connector fixture carries neither ' +
        'config.providerConfig.model_id, config.defaultModel nor a name.'
    );
  }

  const clauses = toolSpanJoinClauses({
    traceId: probe.traceId,
    conversationId: extractConversationId(probe),
  });

  const countsForClause = async (clause: { name: string; where: string }) => {
    try {
      return await countChatModels(traceEsClient, clause.where);
    } catch (error) {
      log.debug(
        `model attribution ${clause.name} join failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  };

  for (const clause of clauses) {
    const counts = await countsForClause(clause);

    if (counts.length > 0) {
      const matched = counts.some(
        ({ model }) => normalizeModelId(model) === normalizeModelId(expected)
      );
      if (!matched) {
        throw new Error(
          `Model attribution mismatch: this run is stamped with "${expected}" but the workflow's ` +
            `chat spans (joined on ${clause.name}) name ${describeModels(
              counts
            )}. The score docs ` +
            `would attribute the numbers to a model the workflow never called — pin the eval ` +
            `connector (pinWorkflowConnector) or fix the stack's ` +
            `${GEN_AI_DEFAULT_CONNECTOR_SETTING}.`
        );
      }

      log.info(`Model attribution verified on ${clause.name}: chat spans name ${expected}`);
      return expected;
    }
  }

  throw new Error(
    `No chat spans reachable via the workflow trace id or the diagnose conversation_id, so the ` +
      `model this run is stamped with ("${expected}") cannot be verified against the trace. ` +
      `Trace-based evidence is missing — check the tracing ES export before trusting any score ` +
      `doc of this run.`
  );
};
