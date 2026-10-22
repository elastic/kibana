/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AgentBuilderPluginSetup,
  BuiltinToolDefinition,
  StaticToolRegistration,
} from '@kbn/agent-builder-server';
import type { ICaseRegistry } from './case_registry';
import { MAX_OPEN_EVENT_RESULTS } from './open_event_search';

/** Listed in Agent Builder's allow list of built-in tools. */
export const DETECTION_ENGINE_EVENT_SEARCH_TOOL_ID =
  platformSignificantEventsTools.detectionEngineEventSearch;

const eventSearchSchema = lazySchema(() =>
  z.object({
    case_id: z.string().min(1).max(64).describe('The case_id of the case you are assessing.'),
    services: z
      .array(z.string().min(1).max(256))
      .max(20)
      .optional()
      .describe('Keep events on any of these services. Omit to search every service.'),
    text: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Keep events whose title, summary, services or signals mention any of these words. Omit to skip.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_OPEN_EVENT_RESULTS)
      .optional()
      .describe(`How many events to return, newest first. Defaults to 10.`),
  })
);

function createEventSearchTool(
  registry: ICaseRegistry
): StaticToolRegistration<typeof eventSearchSchema> {
  const tool: BuiltinToolDefinition<typeof eventSearchSchema> = {
    id: DETECTION_ENGINE_EVENT_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Search open significant events',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: `Lists the significant events that are open right now in the detection engine, as the run assessing the case sees them, including events it opened moments ago.

Each event has its id, title, summary, severity, status, services, when it opened and was last updated, and its latest signals.

Use it to decide whether the case's signal is part of a problem that already has an open event: the same failure, a failure spreading along a dependency, or symptoms that started together. Only works for the case you are assessing; pass its case_id.`,
    schema: eventSearchSchema,
    tags: ['significant-events', 'detection-engine'],
    handler: async ({ case_id: caseId, services, text, limit }) => {
      const search = registry.get(caseId);
      if (!search) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `No case "${caseId}" is being assessed. Pass the case_id from the case.`,
              },
            },
          ],
        };
      }
      return {
        results: [
          { type: ToolResultType.other, data: { ...search.search({ services, text, limit }) } },
        ],
      };
    },
  };
  return tool;
}

/** Registers the event search tool with Agent Builder; called once, at setup. */
export function registerEventSearchTool({
  agentBuilder,
  registry,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  registry: ICaseRegistry;
}): void {
  agentBuilder.tools.register(createEventSearchTool(registry));
}
