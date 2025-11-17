/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentPluginSetupDependencies } from '../types';
import { OBSERVABILITY_AGENT_TOOL_IDS } from '../tools/register_tools';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '../tools';

export const OBSERVABILITY_AGENT_ID = 'observability.agent';

export async function registerObservabilityAgent({
  plugins,
  logger,
}: {
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
        `### OUTPUT STYLE for ALERTS\n` +
        `- When alerts results are provided (e.g., from \`${OBSERVABILITY_GET_ALERTS_TOOL_ID}\`), respond with a concise Markdown table.\n` +
        `- Use only the \`selectedFields\` metadata to define up to 5 columns for the table. Do **NOT** pick more than 5 fields.\n` +
        `- When choosing fields for the columns, choose fields that are most relevant to the user's request and conversation context.\n` +
        `- Generate human-friendly column names by converting dotted paths to Title Case and stripping common prefixes like \`kibana.alert.\` or \`service.\`.\n` +
        `- Leave cells blank when values are missing.\n` +
        `- Always add a summary of the results in addition to the table. Mention the total number of alerts in the summary.`,
      tools: [
        {
          tool_ids: OBSERVABILITY_AGENT_TOOL_IDS,
        },
      ],
    },
  });

  logger.debug('Successfully registered observability agent in agent-builder');
}
