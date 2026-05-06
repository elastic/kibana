/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core/server';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { MitreEntityType, MitreFramework } from '@kbn/security-mitre-attack-common';
import type { MitreAttackDataService } from '../../../lib/mitre_attack';
import { APP_UI_ID } from '../../../../common';

interface MitreAttackToolDeps {
  mitreAttackDataService: MitreAttackDataService;
  getSpaceId: (request: KibanaRequest) => string;
}

export const MITRE_ATTACK_TOOL_ID = 'mitre-attack-tool';

const toolDetails = {
  id: MITRE_ATTACK_TOOL_ID,
  name: 'MitreAttackTool',
  description:
    'Search the managed MITRE ATT&CK index for tactics, techniques, or subtechniques relevant to a query. Returns entities with id, name, description, and reference URL. Use this when answering questions about MITRE ATT&CK coverage, mappings, or threat behaviors.',
};

const inputSchema = z.object({
  question: z
    .string()
    .describe(
      'Free-form question or keywords describing the adversary behavior, technique, or tactic to look up in the MITRE ATT&CK framework (e.g. "credential dumping", "persistence via scheduled tasks").'
    ),
  framework: z
    .enum(['enterprise', 'mobile', 'ics', 'atlas'])
    .optional()
    .describe('Which MITRE framework to search. Defaults to "enterprise".'),
  types: z
    .array(z.enum(['tactic', 'technique', 'subtechnique']))
    .optional()
    .describe('Restrict results to a subset of entity types. Defaults to all types.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of results to return. Defaults to 10.'),
});

/**
 * Build the MITRE_ATTACK_TOOL bound to the security_solution-owned
 * `MitreAttackDataService`. The factory is invoked once at plugin start
 * so the closure captures stable dependencies; the tool's `getTool`
 * receives request-scoped params (esClient, request) on each invocation.
 */
export const buildMitreAttackTool = (deps: MitreAttackToolDeps): AssistantTool => ({
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams) => params.request != null,
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { esClient, request } = params;
    const spaceId = deps.getSpaceId(request);
    const client = deps.mitreAttackDataService.createClient({
      spaceId,
      esClient,
    });

    return tool(
      async ({ question, framework, types, limit }) => {
        const entities = await client.search({
          query: question,
          framework: (framework ?? 'enterprise') as MitreFramework,
          types: types as MitreEntityType[] | undefined,
          limit: limit ?? 10,
        });

        return JSON.stringify({
          entities: entities.map((e) => ({
            type: e.type,
            id: e.id,
            name: e.name,
            description: e.description,
            reference: e.reference,
            framework: e.framework,
            ...('tactics' in e ? { tactics: e.tactics } : {}),
            ...('techniqueId' in e ? { techniqueId: e.techniqueId } : {}),
          })),
        });
      },
      {
        name: toolDetails.name,
        description: params.description || toolDetails.description,
        schema: inputSchema,
        tags: ['mitre', 'attack', 'security'],
      }
    );
  },
});
