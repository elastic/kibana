/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { EXTRACT_IOCS_API_PATH, THREAT_INTEL_TOOL_IDS } from '../../../common';
import { extractIocs } from '../../services';

/**
 * Thin Agent Builder tool wrapper for the `extract_iocs` domain action.
 *
 * Canonical execution surface is the internal HTTP route at
 * `EXTRACT_IOCS_API_PATH`. Used by Workflow 2 during automated ingestion
 * (which calls the shared service directly) and surfaced as a tool only
 * for 3rd party agent portability.
 */
const extractIocsSchema = z.object({
  text: z.string().min(1).describe('Free-form text to scan for IOCs.'),
  defang: z
    .boolean()
    .optional()
    .default(true)
    .describe('Return values in defanged form (e.g. "evil[.]com", "192[.]168[.]1[.]1").'),
});

export const extractIocsTool: BuiltinToolDefinition<typeof extractIocsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.extractIocs,
  type: ToolType.builtin,
  description:
    `Portability wrapper around POST ${EXTRACT_IOCS_API_PATH}. ` +
    'Extract IOCs (hashes, IPs, domains, URLs) from a block of text using conservative regexes. ' +
    'Used by Workflow 2 during automated ingestion. Inside Kibana, prefer calling the route ' +
    'directly via `execute_workflow_step` + `kibana-request`.',
  schema: extractIocsSchema,
  tags: ['threat-intel', 'ioc-extraction'],
  handler: async (params) => {
    const data = extractIocs(params);
    return { results: [{ type: ToolResultType.other, data }] };
  },
};
