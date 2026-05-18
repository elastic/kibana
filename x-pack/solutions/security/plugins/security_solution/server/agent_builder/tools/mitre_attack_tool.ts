/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { MitreEntityType, MitreFramework } from '@kbn/security-mitre-attack-common';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';
import type { MitreAttackDataService } from '../../lib/mitre_attack';
import { securityTool } from './constants';

interface MitreAttackToolDeps {
  mitreAttackDataService: MitreAttackDataService;
}

export const SECURITY_MITRE_ATTACK_TOOL_ID = securityTool('mitre_attack');

const mitreAttackSchema = z.object({
  question: z
    .string()
    .describe(
      'Free-form question or keywords describing the adversary behavior, technique, or tactic to look up in the MITRE ATT&CK framework (e.g. "credential dumping", "persistence via scheduled tasks", "T1671").'
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

export const mitreAttackTool = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  deps: MitreAttackToolDeps
): BuiltinToolDefinition<typeof mitreAttackSchema> => ({
  id: SECURITY_MITRE_ATTACK_TOOL_ID,
  type: ToolType.builtin,
  description: `Search the managed MITRE ATT&CK index for tactics, techniques, or subtechniques relevant to a query. Returns entities with id, name, description, tactic mappings, and reference URL. Use this whenever the user asks about MITRE ATT&CK coverage, a specific technique by ID (e.g. T1671), threat behaviors, adversary TTPs, or how detections map to ATT&CK. Prefer this tool over relying on model knowledge for any MITRE ATT&CK lookups.`,
  schema: mitreAttackSchema,
  tags: ['mitre', 'attack', 'security', 'threat-hunting'],
  availability: {
    cacheMode: 'global',
    handler: async () => {
      if (!experimentalFeatures?.managedMitreSourceEnabled) {
        return {
          status: 'unavailable',
          reason:
            'The managed MITRE ATT&CK data source is not enabled. Enable it via experimental feature flag "managedMitreSourceEnabled".',
        };
      }
      return { status: 'available' };
    },
  },
  handler: async ({ question, framework, types, limit }, { request, esClient }) => {
    try {
      const [, startPlugins] = await core.getStartServices();
      const spaceId = startPlugins.spaces?.spacesService?.getSpaceId(request) ?? 'default';

      const client = deps.mitreAttackDataService.createClient({
        spaceId,
        esClient: esClient.asInternalUser,
      });

      const entities = await client.search({
        query: question,
        framework: (framework ?? 'enterprise') as MitreFramework,
        types: types as MitreEntityType[] | undefined,
        limit: limit ?? 10,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              entities: entities.map((entity) => ({
                type: entity.type,
                id: entity.id,
                name: entity.name,
                description: entity.description,
                reference: entity.reference,
                framework: entity.framework,
                ...('tactics' in entity ? { tactics: entity.tactics } : {}),
                ...('techniqueId' in entity ? { techniqueId: entity.techniqueId } : {}),
              })),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`${SECURITY_MITRE_ATTACK_TOOL_ID} tool failed: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to search MITRE ATT&CK index: ${message}`,
            },
          },
        ],
      };
    }
  },
});
