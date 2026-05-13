/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { subtechniqueById, techniqueById } from '@kbn/securitysolution-mitre-catalog';
import {
  SEVERITY_LEVELS,
  SOURCE_TYPES,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common';

const coverageGapSchema = z.object({
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .describe('Window of `.kibana-threat-reports-*` to evaluate against current rule coverage.'),
  tags: z
    .array(z.string().min(1))
    .optional()
    .describe('Restrict to reports matching any of these tags (joins on `tags` keyword field).'),
  source_types: z
    .array(z.enum(SOURCE_TYPES))
    .optional()
    .describe('Restrict to a subset of source types.'),
  min_severity: z
    .enum(SEVERITY_LEVELS)
    .optional()
    .describe('Minimum severity threshold for in-the-wild techniques.'),
  max_techniques: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of in-wild technique rows to return.'),
});

const SEVERITY_RANK: Record<(typeof SEVERITY_LEVELS)[number], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const tacticIdsForTechnique = (techniqueId: string): string[] => {
  // Resolve through the catalog (including sub-techniques) so the rendered
  // heatmap row can show a meaningful tactic label.
  const technique = techniqueById.get(techniqueId);
  if (technique) return [technique.tactics[0] ?? '<unmapped>'];
  const sub = subtechniqueById.get(techniqueId);
  if (sub) return [sub.tactics[0] ?? '<unmapped>'];
  return ['<unmapped>'];
};

const techniqueDisplayName = (techniqueId: string): string => {
  const technique = techniqueById.get(techniqueId);
  if (technique) return technique.name;
  const sub = subtechniqueById.get(techniqueId);
  if (sub) return sub.name;
  return techniqueId;
};

interface RuleThreatTechnique {
  id: string;
  subtechnique?: Array<{ id: string }>;
}

interface RuleThreatBlock {
  framework?: string;
  technique?: RuleThreatTechnique[];
}

/**
 * Walks `params.threat[].technique[]` (and `.subtechnique[]`) on every enabled
 * SIEM rule and returns the set of ATT&CK technique IDs the customer is
 * already detecting on. Sub-technique IDs are normalized to keyword form so
 * they can be joined directly against the in-wild technique IDs extracted
 * from `.kibana-threat-reports-*`.
 */
const collectRuleTechniques = async (
  savedObjectsClient: Parameters<
    BuiltinSkillBoundedTool<typeof coverageGapSchema>['handler']
  >[1]['savedObjectsClient']
): Promise<{ covered: Set<string>; rulesByTechnique: Map<string, number> }> => {
  const covered = new Set<string>();
  const rulesByTechnique = new Map<string, number>();
  const filter = SECURITY_SOLUTION_RULE_TYPE_IDS.map(
    (id) => `alert.attributes.alertTypeId:"${id}"`
  ).join(' OR ');
  const enabledFilter = `(${filter}) AND alert.attributes.enabled:true`;

  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    // Saved-objects find caps at 10k results — 10 pages * 200/page = 2k rules
    // is well above realistic deployments and bounds tail latency.
    const response = await savedObjectsClient.find<{
      params?: { threat?: RuleThreatBlock[] };
    }>({
      type: 'alert',
      page,
      perPage,
      filter: enabledFilter,
    });

    for (const rule of response.saved_objects) {
      const threatBlocks = rule.attributes?.params?.threat ?? [];
      for (const block of threatBlocks) {
        for (const tech of block.technique ?? []) {
          if (tech.id) {
            covered.add(tech.id);
            rulesByTechnique.set(tech.id, (rulesByTechnique.get(tech.id) ?? 0) + 1);
          }
          for (const sub of tech.subtechnique ?? []) {
            if (sub.id) {
              covered.add(sub.id);
              rulesByTechnique.set(sub.id, (rulesByTechnique.get(sub.id) ?? 0) + 1);
            }
          }
        }
      }
    }

    if (response.saved_objects.length < perPage) break;
    page += 1;
  }

  return { covered, rulesByTechnique };
};

export const coverageGapTool: BuiltinSkillBoundedTool<typeof coverageGapSchema> = {
  id: THREAT_INTEL_TOOL_IDS.coverageGap,
  type: ToolType.builtin,
  description:
    'Compute the gap between ATT&CK techniques observed in recent threat reports and ATT&CK ' +
    "techniques covered by the customer's currently enabled Detection Engine rules. The " +
    'output is rendered through the `threat-intel-mitre-heatmap` attachment with ' +
    '`mode: "coverage"` — covered techniques render green, uncovered techniques render red. ' +
    'Use when the user asks "what\'s in the wild that I don\'t cover?", "do we have ' +
    'detections for last week\'s threats?", or before recommending `hunt_behavior` to ' +
    'prioritize uncovered techniques.',
  schema: coverageGapSchema,
  handler: async (
    {
      time_range: timeRange,
      tags,
      source_types: sourceTypes,
      min_severity: minSeverity,
      max_techniques: maxTechniques,
    },
    { esClient, savedObjectsClient, logger }
  ) => {
    const filters: Array<Record<string, unknown>> = [
      { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
    ];
    if (tags?.length) filters.push({ terms: { tags } });
    if (sourceTypes?.length) filters.push({ terms: { 'source.type': sourceTypes } });
    if (minSeverity) {
      const allowed = SEVERITY_LEVELS.filter(
        (level) => SEVERITY_RANK[level] >= SEVERITY_RANK[minSeverity]
      );
      filters.push({ terms: { 'severity.level': allowed } });
    }

    interface AggregationResponse {
      aggregations?: {
        techniques?: {
          buckets: Array<{
            key: string;
            doc_count: number;
            severity_max?: { buckets: Array<{ key: string; doc_count: number }> };
          }>;
        };
      };
    }

    let aggregation: AggregationResponse;
    try {
      aggregation = (await esClient.asCurrentUser.search({
        index: THREAT_REPORTS_INDEX_PATTERN,
        size: 0,
        query: { bool: { filter: filters } },
        aggs: {
          techniques: {
            terms: { field: 'extracted.ttps.techniques', size: maxTechniques * 2 },
            aggs: {
              severity_max: {
                terms: { field: 'severity.level', size: SEVERITY_LEVELS.length },
              },
            },
          },
        },
      })) as AggregationResponse;
    } catch (err) {
      logger.warn(`coverage_gap reports aggregation failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to aggregate techniques over .kibana-threat-reports-*: ${
                (err as Error).message
              }.`,
            },
          },
        ],
      };
    }

    let covered: Set<string>;
    let rulesByTechnique: Map<string, number>;
    try {
      ({ covered, rulesByTechnique } = await collectRuleTechniques(savedObjectsClient));
    } catch (err) {
      logger.warn(`coverage_gap rule walk failed: ${(err as Error).message}`);
      // Degrade gracefully — emit the in-wild techniques without coverage flags
      // so the agent can still narrate "here's what's hot in the window".
      covered = new Set();
      rulesByTechnique = new Map();
    }

    const buckets = aggregation.aggregations?.techniques?.buckets ?? [];
    const severityForBucket = (b: (typeof buckets)[number]): (typeof SEVERITY_LEVELS)[number] => {
      const sevBuckets = b.severity_max?.buckets ?? [];
      const found = sevBuckets
        .map((sb) => sb.key as (typeof SEVERITY_LEVELS)[number])
        .filter((s): s is (typeof SEVERITY_LEVELS)[number] =>
          (SEVERITY_LEVELS as readonly string[]).includes(s)
        );
      if (found.length === 0) return 'medium';
      return found.reduce((max, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[max] ? s : max), found[0]);
    };

    const techniqueRows = buckets.slice(0, maxTechniques).map((bucket) => {
      const techniqueId = bucket.key;
      const isCovered = covered.has(techniqueId);
      return {
        technique_id: techniqueId,
        name: techniqueDisplayName(techniqueId),
        tactic: tacticIdsForTechnique(techniqueId)[0] ?? '<unmapped>',
        article_count: bucket.doc_count,
        severity_max: severityForBucket(bucket),
        top_actors: [],
        has_coverage: isCovered,
        matching_rule_count: rulesByTechnique.get(techniqueId) ?? 0,
      };
    });

    const uncovered = techniqueRows.filter((row) => !row.has_coverage);
    const coveredRows = techniqueRows.filter((row) => row.has_coverage);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            status: 'coverage_gap_evaluated',
            time_range: timeRange,
            counts: {
              total_techniques: techniqueRows.length,
              covered: coveredRows.length,
              uncovered: uncovered.length,
              total_rules_inspected: Array.from(rulesByTechnique.values()).reduce(
                (sum, n) => sum + n,
                0
              ),
            },
            techniques: techniqueRows,
            uncovered_techniques: uncovered.map((u) => u.technique_id),
            attachment_hint: {
              type: 'threat-intel-mitre-heatmap',
              mode: 'coverage',
              payload: {
                time_range_label: `${timeRange.from} → ${timeRange.to}`,
                mode: 'coverage' as const,
                techniques: techniqueRows,
              },
            },
            next_step:
              uncovered.length === 0
                ? 'Every technique observed in this window is already covered by an enabled ' +
                  'SIEM rule. Render the heatmap with mode="coverage" so the user can confirm.'
                : 'For each uncovered technique, prioritize calling `threat_intel.hunt_behavior` ' +
                  'on the underlying reports and proposing a Detection Engine rule via ' +
                  '`security.create_detection_rule`.',
          },
        },
      ],
    };
  },
};
