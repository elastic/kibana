/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-architected PCI scope discovery tool.
 *
 * Part of the `pci-compliance-autonomous` skill's tool bundle. Registered under a distinct
 * ID (`core.security.pci_autonomous_scope_discovery`) so the autonomous skill never sees the
 * hand-written variant's tool surface.
 *
 * Scope-rule heuristics (`SCOPE_RULES`, `ALL_FIELD_HINTS`, `detectCategories`,
 * `calculateCoverage`, `fetchFieldsByIndex`) are authored locally in this file rather than
 * imported from the hand-written variant. The CI test
 * `pci_autonomous_modules_no_handwritten_imports.test.ts` enforces zero imports from
 * `pci_compliance_*` across the whole `pci_autonomous_tools/` tree.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { securityTool } from '../constants';
import {
  pciAutonomousIndexPatternSchema,
  buildAutonomousDiscoveryClaim,
} from './pci_autonomous_schemas';

const pciScopeType = z.enum([
  'all',
  'network',
  'identity',
  'endpoint',
  'cloud',
  'application',
  'vulnerability',
]);

const pciAutonomousScopeDiscoverySchema = z.object({
  scopeType: pciScopeType
    .optional()
    .default('all')
    .describe(
      'Scope focus area for discovery: all, network, identity, endpoint, cloud, application, or vulnerability.'
    ),
  customIndices: z
    .array(pciAutonomousIndexPatternSchema)
    .min(1)
    .max(50)
    .optional()
    .describe(
      'Optional custom index patterns to include for environments with non-native ingestion.'
    ),
});

export const PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID = securityTool(
  'pci_autonomous_scope_discovery'
);

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

/**
 * Structured warning surfaced in the tool's `dataGaps` payload when a
 * downstream cluster call fails or returns an unexpected shape. Lets the
 * agent (and the auditor reading the trace) distinguish "no indices match"
 * from "the inventory was incomplete because Elasticsearch rejected our
 * call". Earlier versions silently swallowed those errors.
 */
interface DiscoveryDataGap {
  kind: 'cat_indices_failed' | 'field_caps_failed' | 'cat_indices_unexpected_shape';
  message: string;
  details?: string[];
}

/**
 * Runtime guard for `cat.indices` responses. The Elasticsearch client typings
 * are wide (`CatIndicesIndicesRecord[]`) and tolerate undefined fields, so a
 * downstream protocol break would otherwise blow up with an opaque
 * `TypeError`. Narrowing here turns "shape changed upstream" into a
 * surfaced dataGap.
 */
const CAT_INDICES_RESPONSE_SCHEMA = z.array(
  z.object({
    index: z.string().min(1).optional(),
  })
);

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

interface FieldsByIndexResult {
  byIndex: Map<string, Set<string>>;
  dataGap?: DiscoveryDataGap;
}

const fetchFieldsByIndex = async (
  indices: string[],
  esClient: ElasticsearchClient
): Promise<FieldsByIndexResult> => {
  const byIndex = new Map<string, Set<string>>();
  for (const idx of indices) byIndex.set(idx, new Set<string>());
  if (indices.length === 0) return { byIndex };
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
  } catch (error) {
    return {
      byIndex,
      dataGap: {
        kind: 'field_caps_failed',
        message: 'Elasticsearch field_caps call failed; ECS coverage estimates may be incomplete.',
        details: [error instanceof Error ? error.message : String(error)],
      },
    };
  }
  return { byIndex };
};

interface CatIndicesResult {
  indices: string[];
  dataGap?: DiscoveryDataGap;
}

/**
 * Wrap `cat.indices` so a network/parse/shape failure becomes a structured
 * dataGap on the tool payload instead of an uncaught exception or a silent
 * empty list. Returns whatever indices the call did manage to surface.
 */
const fetchIndices = async (
  esClient: ElasticsearchClient,
  catArgs: Parameters<ElasticsearchClient['cat']['indices']>[0]
): Promise<CatIndicesResult> => {
  try {
    const raw = await esClient.cat.indices({
      ...catArgs,
      format: 'json',
      h: ['index'],
    });
    const parsed = CAT_INDICES_RESPONSE_SCHEMA.safeParse(raw);
    if (!parsed.success) {
      return {
        indices: [],
        dataGap: {
          kind: 'cat_indices_unexpected_shape',
          message: 'cat.indices returned a payload that did not match the expected shape.',
          details: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
        },
      };
    }
    const indices: string[] = [];
    for (const row of parsed.data) {
      if (row.index) indices.push(row.index);
    }
    return { indices };
  } catch (error) {
    return {
      indices: [],
      dataGap: {
        kind: 'cat_indices_failed',
        message: 'Elasticsearch cat.indices call failed; index inventory is incomplete.',
        details: [error instanceof Error ? error.message : String(error)],
      },
    };
  }
};

export const pciAutonomousScopeDiscoveryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciAutonomousScopeDiscoverySchema> => {
  return {
    id: PCI_AUTONOMOUS_SCOPE_DISCOVERY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Autonomous-variant PCI scope discovery. Inventory PCI-relevant indices and classify them ' +
      'by scope area (network, identity, endpoint, cloud, application, vulnerability). Returns a ' +
      'discoveryClaim payload (point-in-time inventory snapshot) plus a dataGaps array surfacing ' +
      'any cluster errors that limited inventory completeness. Call this tool first in the ' +
      'autonomous PCI workflow before any compliance check or report.',
    schema: pciAutonomousScopeDiscoverySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ scopeType = 'all', customIndices }, { esClient }) => {
      const dataGaps: DiscoveryDataGap[] = [];

      const baseInventory = await fetchIndices(esClient.asCurrentUser, {
        expand_wildcards: 'all',
      });
      if (baseInventory.dataGap) dataGaps.push(baseInventory.dataGap);

      const indexSet = new Set<string>(baseInventory.indices);
      for (const customIndex of customIndices ?? []) {
        if (customIndex.includes('*') || customIndex.includes('?')) {
          const resolved = await fetchIndices(esClient.asCurrentUser, {
            index: customIndex,
            expand_wildcards: 'all',
          });
          if (resolved.dataGap) dataGaps.push(resolved.dataGap);
          for (const idx of resolved.indices) indexSet.add(idx);
        } else {
          indexSet.add(customIndex);
        }
      }

      const indices = Array.from(indexSet).slice(0, MAX_INDICES_INSPECTED);
      const truncated = indexSet.size > MAX_INDICES_INSPECTED;

      const { byIndex: fieldsByIndex, dataGap: fieldCapsGap } = await fetchFieldsByIndex(
        indices,
        esClient.asCurrentUser
      );
      if (fieldCapsGap) dataGaps.push(fieldCapsGap);

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

      const discoveryClaim = buildAutonomousDiscoveryClaim({
        indices: discovered.map((d) => d.index),
        discoveredAt: new Date().toISOString(),
        fieldHintsInspected: ALL_FIELD_HINTS,
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
              dataGaps,
              discoveryClaim,
            },
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'discovery', 'autonomous'],
  };
};
