/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { subtechniqueById, techniqueById } from '@kbn/securitysolution-mitre-catalog';
import {
  SEVERITY_LEVELS,
  THREAT_REPORTS_INDEX_PATTERN,
  type SeverityLevel,
  type SourceType,
} from '../../../common/threat_intelligence/hub';

/**
 * Domain capability module for the `coverage_gap` action.
 *
 * Joins ATT&CK techniques observed in recent threat reports against the
 * customer's enabled Detection Engine rules and returns covered /
 * uncovered counts plus the per-technique heatmap rows. Same shape is
 * used by the internal HTTP route and the Agent Builder tool wrapper.
 */

export interface CoverageGapParams {
  time_range: { from: string; to: string };
  tags?: string[];
  source_types?: SourceType[];
  min_severity?: SeverityLevel;
  max_techniques?: number;
}

export interface CoverageGapTechniqueRow {
  technique_id: string;
  name: string;
  tactic: string;
  article_count: number;
  severity_max: SeverityLevel;
  top_actors: string[];
  has_coverage: boolean;
  matching_rule_count: number;
}

export interface CoverageGapResult {
  status: 'coverage_gap_evaluated';
  time_range: { from: string; to: string };
  counts: {
    total_techniques: number;
    covered: number;
    uncovered: number;
    total_rules_inspected: number;
  };
  techniques: CoverageGapTechniqueRow[];
  uncovered_techniques: string[];
  attachment_hint: {
    type: 'threat-intel-mitre-heatmap';
    mode: 'coverage';
    payload: {
      time_range_label: string;
      mode: 'coverage';
      techniques: CoverageGapTechniqueRow[];
    };
  };
  next_step: string;
}

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const tacticIdsForTechnique = (techniqueId: string): string[] => {
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
 * Walks `params.threat[].technique[]` (and `.subtechnique[]`) on every
 * enabled SIEM rule and returns the set of ATT&CK technique IDs the
 * customer is already detecting on. Sub-technique IDs are normalized so
 * they can be joined directly against the in-wild technique IDs from
 * the threat-reports data stream.
 */
const collectRuleTechniques = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<{ covered: Set<string>; rulesByTechnique: Map<string, number> }> => {
  const covered = new Set<string>();
  const rulesByTechnique = new Map<string, number>();
  const filter = SECURITY_SOLUTION_RULE_TYPE_IDS.map(
    (id) => `alert.attributes.alertTypeId:"${id}"`
  ).join(' OR ');
  const enabledFilter = `(${filter}) AND alert.attributes.enabled:true`;

  let page = 1;
  const perPage = 200;
  // Saved-objects find caps at 10k results — 10 pages * 200/page = 2k rules
  // is well above realistic deployments and bounds tail latency.
  while (page <= 10) {
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

export const coverageGap = async (
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  params: CoverageGapParams
): Promise<CoverageGapResult> => {
  const {
    time_range: timeRange,
    tags,
    source_types: sourceTypes,
    min_severity: minSeverity,
    max_techniques: maxTechniques = 50,
  } = params;

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

  const aggregation = (await esClient.search({
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
  const severityForBucket = (b: (typeof buckets)[number]): SeverityLevel => {
    const sevBuckets = b.severity_max?.buckets ?? [];
    const found = sevBuckets
      .map((sb) => sb.key as SeverityLevel)
      .filter((s): s is SeverityLevel => (SEVERITY_LEVELS as readonly string[]).includes(s));
    if (found.length === 0) return 'medium';
    return found.reduce((max, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[max] ? s : max), found[0]);
  };

  const techniqueRows: CoverageGapTechniqueRow[] = buckets.slice(0, maxTechniques).map((bucket) => {
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
    status: 'coverage_gap_evaluated',
    time_range: timeRange,
    counts: {
      total_techniques: techniqueRows.length,
      covered: coveredRows.length,
      uncovered: uncovered.length,
      total_rules_inspected: Array.from(rulesByTechnique.values()).reduce((sum, n) => sum + n, 0),
    },
    techniques: techniqueRows,
    uncovered_techniques: uncovered.map((u) => u.technique_id),
    attachment_hint: {
      type: 'threat-intel-mitre-heatmap',
      mode: 'coverage',
      payload: {
        time_range_label: `${timeRange.from} → ${timeRange.to}`,
        mode: 'coverage',
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
  };
};
