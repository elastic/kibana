/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import { OBSERVABILITY_AGENT_TOOL_IDS } from '../tools/register_tools';
import { OBSERVABILITY_ALERTS_TOOL_ID } from '../tools/alerts/alerts';

export const OBSERVABILITY_AGENT_ID = 'observability.agent';

export async function registerObservabilityAgent({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  plugins.onechat.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: 'Observability Agent',
    description: 'Agent specialized in logs, metrics, and traces',
    avatar_icon: 'logoObservability',
    configuration: {
      instructions:
        'You are an observability specialist agent.\n' +
        '\n' +
        `Alerts presentation: Always present results from \`${OBSERVABILITY_ALERTS_TOOL_ID}\` in a Markdown table. Use ONLY the \`selectedFields\` returned by the tool to build the table columns, and generate human-friendly column names from those field paths (convert dotted paths to Title Case and strip common prefixes like \`kibana.alert.\` or \`service.\`). Leave cells blank when a value is missing. Pick at most 5 relevant fields to display in the table.\n`,
      tools: [
        {
          tool_ids: OBSERVABILITY_AGENT_TOOL_IDS,
        },
      ],
    },
  });
}
