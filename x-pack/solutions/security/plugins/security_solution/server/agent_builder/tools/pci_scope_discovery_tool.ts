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
import { pciIndexPatternSchema, buildScopeClaim } from './pci_compliance_schemas';

const pciScopeType = z.enum([
  'all',
  'network',
  'identity',
  'endpoint',
  'cloud',
  'application',
  'vulnerability',
]);

const pciScopeDiscoverySchema = z.object({
  scopeType: pciScopeType
    .optional()
    .default('all')
    .describe(
      'Scope focus area for discovery: all, network, identity, endpoint, cloud, or application'
    ),
  customIndices: z
    .array(pciIndexPatternSchema)
    .min(1)
    .max(50)
    .optional()
    .describe(
      'Optional custom index patterns to include for environments with non-native ingestion.'
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
  vulnerability: {
    fieldHints: ['vulnerability.id', 'vulnerability.severity', 'event.kind'],
    nameHints: ['vuln', 'vulnerability', 'cve', 'ids', 'intrusion'],
  },
};

const ALL_FIELD_HINTS = Array.from(
  new Set(
    (Object.keys(SCOPE_RULES) as Array<Exclude<ScopeCategory, 'all'>>).flatMap(
      (category) => SCOPE_RULES[category].fieldHints
    )
  )
);

const MAX_INDICES_INSPECTED = 200;

const detectCategories = (index: string, fields: Set<string>): ScopeCategory[] => {
  const lowerIndex = index.toLowerCase();
  return (Object.keys(SCOPE_RULES) as Array<Exclude<ScopeCategory, 'all'>>).filter((category) => {
    const { fieldHints, nameHints } = SCOPE_RULES[category];
    const hasFieldMatch = fieldHints.some((field) => fields.has(field));
    const hasNameMatch = nameHints.some((hint) => lowerIndex.includes(hint));
    return hasFieldMatch || hasNameMatch;
  });
};

const calculateCoverage = (fields: Set<string>): number => {
  if (ALL_FIELD_HINTS.length === 0) return 0;
  const present = ALL_FIELD_HINTS.filter((field) => fields.has(field)).length;
  return Math.round((present / ALL_FIELD_HINTS.length) * 100);
};

/**
 * Build a per-index map of available fields from a single batched `fieldCaps` call.
 *
 * The prior implementation fired one `fieldCaps` request per discovered index which became
 * O(thousands) of sequential RTTs on large clusters. By issuing a single call across the
 * consolidated index set and keying on `field.indices` (populated when a field exists in
 * only a subset of the requested indices) plus a fallback of "present everywhere", we
 * reduce this to a single round-trip.
 */
const fetchFieldsByIndex = async (
  indices: string[],
  esClient: ElasticsearchClient
): Promise<Map<string, Set<string>>> => {
  const byIndex = new Map<string, Set<string>>();
  for (const idx of indices) byIndex.set(idx, new Set<string>());

  if (indices.length === 0) return byIndex;

  try {
    const response = await esClient.fieldCaps({
      index: indices,
      fields: ['*'],
      include_unmapped: false,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const fields = response.fields ?? {};
    for (const [fieldName, fieldTypes] of Object.entries(fields)) {
      const typeEntries = Object.values(fieldTypes ?? {});
      // If any type entry omits `indices`, the field exists across every requested index.
      const presentEverywhere = typeEntries.some((entry) => !entry?.indices);
      if (presentEverywhere) {
        for (const set of byIndex.values()) set.add(fieldName);
      } else {
        for (const entry of typeEntries) {
          const entryIndices = entry?.indices ?? [];
          const arr = Array.isArray(entryIndices) ? entryIndices : [entryIndices];
          for (const idx of arr) {
            const set = byIndex.get(idx);
            if (set) set.add(fieldName);
          }
        }
      }
    }
  } catch {
    // Fall through with empty maps; callers will simply treat indices as having no known fields.
  }

  return byIndex;
};

export const pciScopeDiscoveryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciScopeDiscoverySchema> => {
  return {
    id: PCI_SCOPE_DISCOVERY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Discover PCI-relevant data coverage across indices, including custom-ingested data, and ' +
      'classify by scope area. Uses a single batched fieldCaps call across up to ' +
      `${MAX_INDICES_INSPECTED} indices rather than per-index round-trips.`,
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

      const indexSet = new Set<string>();
      for (const { index } of indicesResponse) {
        if (index) indexSet.add(index);
      }
      for (const customIndex of customIndices ?? []) {
        if (customIndex.includes('*') || customIndex.includes('?')) {
          // Resolve wildcard patterns to concrete index names so `fetchFieldsByIndex`
          // receives real index names (not globs) as map keys.
          const resolved = (await esClient.asCurrentUser.cat.indices({
            index: customIndex,
            format: 'json',
            h: ['index'],
            expand_wildcards: 'all',
          })) as Array<{ index?: string }>;
          for (const { index } of resolved) {
            if (index) indexSet.add(index);
          }
        } else {
          indexSet.add(customIndex);
        }
      }

      const indices = Array.from(indexSet).slice(0, MAX_INDICES_INSPECTED);
      const truncated = indexSet.size > MAX_INDICES_INSPECTED;

      const fieldsByIndex = await fetchFieldsByIndex(indices, esClient.asCurrentUser);

      const discovered: DiscoveredIndex[] = [];
      for (const index of indices) {
        const fields = fieldsByIndex.get(index) ?? new Set<string>();
        const categories = detectCategories(index, fields);
        const shouldInclude =
          categories.length > 0 && (scopeType === 'all' || categories.includes(scopeType));
        if (shouldInclude) {
          discovered.push({
            index,
            categories,
            ecsCoveragePercent: calculateCoverage(fields),
            availableFields: Array.from(fields).slice(0, 50),
          });
        }
      }

      const scopeClaim = buildScopeClaim({
        indices: discovered.map((d) => d.index),
        from: new Date(0).toISOString(),
        to: new Date().toISOString(),
        requirementsEvaluated: [],
        requiredFieldsChecked: ALL_FIELD_HINTS,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              scopeType,
              totalIndicesInspected: indices.length,
              indicesTruncated: truncated,
              matchedIndices: discovered.length,
              discovered,
              scopeClaim,
            },
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'discovery'],
  };
};
