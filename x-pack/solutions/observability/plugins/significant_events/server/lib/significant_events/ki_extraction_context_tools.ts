/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ToolsStart } from '@kbn/agent-builder-server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import {
  createInferenceToolsFromAgentBuilder,
  type BridgedToolSpec,
} from '../agent_builder/inference_tool_bridge';

/**
 * Prior Significant Events / investigation context tools for KI query generation
 * (`executeAsReasoningAgent`). Bridged from the Agent Builder `event_search` tool
 * so schemas stay in sync with the managed tool registration.
 *
 * Read-only: these tools only search existing events; they never write them.
 */
export interface KiExtractionContextTools {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  promptSnippet: string;
}

const EVENT_SEARCH_SPEC: BridgedToolSpec = {
  sourceToolId: platformSignificantEventsTools.searchEvent,
  name: 'significant_event_search',
  description:
    'Search existing Significant Events for the target stream (and related filters). ' +
    'Use view "full" when you need assessment notes, demotion justifications, or linked investigation outcomes. ' +
    'Prefer status filters (e.g. dismissed) when looking for known-noisy / demoted patterns to avoid regenerating.',
};

const PROMPT_SNIPPET = `
You also have access to prior Significant Events and investigation outcomes for this stream. Before proposing new or refreshed KI queries, consult that history so you do not blindly reintroduce patterns the system has already classified:
- **significant_event_search** — Search Significant Events (open, dismissed, closed). Use \`view: "full"\` to include assessment notes and linked investigations. Filter by \`stream_names\` for the current stream; use status \`dismissed\` when checking for known noise / demotions.

When prior findings show a query path was noisy, single-tenant, known-benign, or already investigated as non-actionable, prefer refining/avoiding that path over regenerating an equivalent rule. Prefer and annotate high-value patterns that previously produced useful detections.`;

/**
 * Builds inference tools that expose Significant Event (and attached investigation)
 * history to KI extraction. Returns `undefined` when Agent Builder tools are
 * unavailable or `event_search` cannot be resolved, so extraction degrades gracefully.
 */
export const createKiExtractionContextTools = async ({
  agentBuilderTools,
  request,
  logger,
}: {
  agentBuilderTools: ToolsStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<KiExtractionContextTools | undefined> => {
  const { tools, callbacks } = await createInferenceToolsFromAgentBuilder({
    tools: agentBuilderTools,
    request,
    specs: [EVENT_SEARCH_SPEC],
    logger,
  });

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  return { tools, callbacks, promptSnippet: PROMPT_SNIPPET };
};
