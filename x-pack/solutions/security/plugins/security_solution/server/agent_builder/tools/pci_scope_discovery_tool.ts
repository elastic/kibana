/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';

const pciScopeType = z.enum(['all', 'network', 'identity', 'endpoint', 'cloud', 'application']);

const pciScopeDiscoverySchema = z.object({
  scopeType: pciScopeType
    .optional()
    .default('all')
    .describe(
      'Scope focus area for discovery: all, network, identity, endpoint, cloud, or application'
    ),
  customIndices: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Optional custom index patterns to include for environments with non-native ingestion'
    ),
});

export const PCI_SCOPE_DISCOVERY_TOOL_ID = securityTool('pci_scope_discovery');

type ScopeCategory = z.infer<typeof pciScopeType>;

interface DiscoveredIndex {
  index: string;
  categories: ScopeCategory[];
  ecsCoveragePercent: number;
  availableFields: string[];
}

const SCOPE_RULES: Record<
  Exclude<ScopeCategory, 'all'>,
  { fieldHints: string[]; nameHints: string[] }
> = {
  network: {
    fieldHints: ['event.category', 'source.ip', 'destination.ip', 'network.direction'],
    nameHints: ['network', 'packetbeat', 'firewall', 'netflow'],
  },
  identity: {
    fieldHints: ['event.category', 'user.name', 'event.outcome', 'source.ip'],
    nameHints: ['auth', 'identity', 'login', 'audit'],
  },
  endpoint: {
    fieldHints: ['host.name', 'process.name', 'file.path', 'event.module'],
    nameHints: ['endpoint', 'winlogbeat', 'osquery', 'host'],
  },
  cloud: {
    fieldHints: ['cloud.provider', 'cloud.account.id', 'cloud.region', 'event.module'],
    nameHints: ['cloud', 'aws', 'gcp', 'azure'],
  },
  application: {
    fieldHints: ['event.category', 'url.domain', 'http.request.method', 'service.name'],
    nameHints: ['app', 'web', 'nginx', 'apache'],
  },
};

const detectCategories = (index: string, fields: string[]): ScopeCategory[] => {
  const lowerIndex = index.toLowerCase();
  const categoryMatches = (Object.keys(SCOPE_RULES) as Array<Exclude<ScopeCategory, 'all'>>).filter(
    (category) => {
      const { fieldHints, nameHints } = SCOPE_RULES[category];
      const hasFieldMatch = fieldHints.some((field) => fields.includes(field));
      const hasNameMatch = nameHints.some((hint) => lowerIndex.includes(hint));
      return hasFieldMatch || hasNameMatch;
    }
  );
  return categoryMatches;
};

const calculateCoverage = (fields: string[]): number => {
  const ecsHints = new Set(
    (Object.keys(SCOPE_RULES) as Array<Exclude<ScopeCategory, 'all'>>).flatMap(
      (category) => SCOPE_RULES[category].fieldHints
    )
  );

  if (ecsHints.size === 0) {
    return 0;
  }

  const present = [...ecsHints].filter((field) => fields.includes(field)).length;
  return Math.round((present / ecsHints.size) * 100);
};

const getFieldList = async (index: string, esClient: ElasticsearchClient): Promise<string[]> => {
  try {
    const response = await esClient.fieldCaps({
      index,
      fields: ['*'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    return Object.keys(response.fields ?? {});
  } catch {
    return [];
  }
};

export const pciScopeDiscoveryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciScopeDiscoverySchema> => {
  return {
    id: PCI_SCOPE_DISCOVERY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Discover PCI-relevant data coverage across indices, including custom-ingested data, and classify by scope area.',
    schema: pciScopeDiscoverySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ scopeType = 'all', customIndices }, { esClient }) => {
      const indicesResponse = (await esClient.asCurrentUser.cat.indices({
        format: 'json',
        h: ['index'],
        expand_wildcards: 'all',
      })) as Array<{ index: string }>;

      const indexSet = new Set(indicesResponse.map(({ index }) => index).filter(Boolean));
      for (const customIndex of customIndices ?? []) {
        indexSet.add(customIndex);
      }

      const discovered: DiscoveredIndex[] = [];
      for (const index of indexSet) {
        const fields = await getFieldList(index, esClient.asCurrentUser);
        const categories = detectCategories(index, fields);
        const shouldInclude =
          categories.length > 0 && (scopeType === 'all' || categories.includes(scopeType));
        if (shouldInclude) {
          discovered.push({
            index,
            categories,
            ecsCoveragePercent: calculateCoverage(fields),
            availableFields: fields.slice(0, 50),
          });
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              scopeType,
              totalIndicesInspected: indexSet.size,
              matchedIndices: discovered.length,
              discovered,
            },
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'discovery'],
  };
};
