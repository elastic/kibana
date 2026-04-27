/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import {
  type ComplianceConfidence,
  type ComplianceStatus,
  type PciRequirementDefinition,
  buildPciTimeRangeParams,
  PCI_REQUIREMENTS,
} from './pci_compliance_requirements';

export interface EvaluateRequirementArgs {
  requirementId: string;
  indexPattern: string;
  from: string;
  to: string;
  includeEvidence: boolean;
  esClient: ElasticsearchClient;
}

export interface RequirementFinding {
  check: string;
  status: ComplianceStatus;
  detail: string;
  evidence?: {
    query: string;
    columns: Array<{ name: string; type: string }>;
    values: unknown[][];
  };
}

export interface EvaluatedRequirement {
  requirement: string;
  name: string;
  pciReference: string;
  status: ComplianceStatus;
  confidence: ComplianceConfidence;
  summary: string;
  caveats: string[];
  findings: RequirementFinding[];
  recommendations: string[];
  dataGaps: string[];
  evidenceCount: number;
  /** Numeric 0-100 score factoring confidence into status. */
  score: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

async function runPreflight(
  definition: PciRequirementDefinition,
  indexPattern: string,
  esClient: ElasticsearchClient
): Promise<{ confidence: ComplianceConfidence; missingFields: string[] }> {
  try {
    const fieldCaps = await esClient.fieldCaps({
      index: indexPattern,
      fields: definition.requiredFields,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const existingFields = Object.keys(fieldCaps.fields ?? {});
    const missing = definition.requiredFields.filter(
      (f) => f !== '@timestamp' && !existingFields.includes(f)
    );

    const requiredWithoutTimestamp = definition.requiredFields.filter((f) => f !== '@timestamp');
    if (requiredWithoutTimestamp.length > 0 && missing.length === requiredWithoutTimestamp.length) {
      return { confidence: 'NOT_ASSESSABLE', missingFields: missing };
    }
    if (missing.length > 0) {
      return { confidence: 'MEDIUM', missingFields: missing };
    }
    return { confidence: 'HIGH', missingFields: [] };
  } catch {
    return { confidence: 'LOW', missingFields: [] };
  }
}

function statusToScore(status: ComplianceStatus, confidence: ComplianceConfidence): number {
  const baseScore = status === 'GREEN' ? 100 : status === 'AMBER' ? 50 : status === 'RED' ? 0 : 25;
  const confidenceWeight =
    confidence === 'HIGH' ? 1.0 : confidence === 'MEDIUM' ? 0.8 : confidence === 'LOW' ? 0.5 : 0.3;
  return Math.round(baseScore * confidenceWeight);
}

function buildResult(
  definition: PciRequirementDefinition,
  status: ComplianceStatus,
  confidence: ComplianceConfidence,
  findings: RequirementFinding[],
  caveats: string[],
  evidenceCount: number,
  missingFields: string[] = []
): EvaluatedRequirement {
  const statusLabel =
    status === 'GREEN'
      ? 'compliant'
      : status === 'RED'
      ? 'non-compliant'
      : status === 'AMBER'
      ? 'partially assessable'
      : 'not assessable';

  return {
    requirement: definition.id,
    name: definition.name,
    pciReference: definition.pciReference,
    status,
    confidence,
    summary: `Requirement ${definition.id} is ${statusLabel} (confidence: ${confidence}).`,
    caveats,
    findings,
    recommendations: definition.recommendations,
    dataGaps: status === 'GREEN' || status === 'RED' ? [] : missingFields,
    evidenceCount,
    score: statusToScore(status, confidence),
  };
}

/**
 * Evaluate a single PCI DSS requirement against an index pattern + time range.
 *
 * Implementation notes:
 *  - ES|QL queries reference `?_tstart` / `?_tend` named parameters. Time-range values are
 *    bound via the ES|QL params array (never interpolated into the query string), which is
 *    the security boundary against injection in user-supplied time ranges.
 *  - The index pattern is interpolated into `FROM` because ES|QL cannot parameterise the
 *    target index. The caller MUST have validated the pattern against
 *    `pciIndexPatternSchema` before this function is reached.
 *  - Layering is intentional: (1) violation query, (2) coverage query, (3) field preflight.
 *    Each layer tightens confidence and narrows the RED / AMBER / GREEN verdict.
 */
export async function evaluateRequirement({
  requirementId,
  indexPattern,
  from,
  to,
  includeEvidence,
  esClient,
}: EvaluateRequirementArgs): Promise<EvaluatedRequirement> {
  const definition = PCI_REQUIREMENTS[requirementId];
  const params = buildPciTimeRangeParams({ from, to });
  const caveats: string[] = [];
  const findings: RequirementFinding[] = [];
  let status: ComplianceStatus = 'AMBER';
  let confidence: ComplianceConfidence = 'LOW';
  let evidenceCount = 0;

  // Layer 1 — violation query (if the requirement defines one)
  if (definition.buildViolationEsql) {
    const violationEsql = definition.buildViolationEsql(indexPattern);
    try {
      const violationResult = await executeEsql({ query: violationEsql, params, esClient });
      const rowCount = violationResult.values?.length ?? 0;

      if (definition.verdict === 'rows_mean_violation' && rowCount > 0) {
        status = 'RED';
        confidence = 'HIGH';
        evidenceCount = rowCount;
        findings.push({
          check: `${definition.id} violation detection`,
          status: 'RED',
          detail: `Found ${rowCount} violation(s) for ${definition.name}.`,
          ...(includeEvidence
            ? {
                evidence: {
                  query: violationEsql,
                  columns: violationResult.columns,
                  values: violationResult.values.slice(0, 50),
                },
              }
            : {}),
        });
        return buildResult(definition, status, confidence, findings, caveats, evidenceCount);
      }

      if (definition.verdict === 'rows_mean_evidence' && rowCount > 0) {
        status = 'GREEN';
        confidence = 'HIGH';
        evidenceCount = rowCount;
        findings.push({
          check: `${definition.id} evidence detection`,
          status: 'GREEN',
          detail: `Found ${rowCount} evidence record(s) for ${definition.name}.`,
          ...(includeEvidence
            ? {
                evidence: {
                  query: violationEsql,
                  columns: violationResult.columns,
                  values: violationResult.values.slice(0, 50),
                },
              }
            : {}),
        });
        return buildResult(definition, status, confidence, findings, caveats, evidenceCount);
      }
    } catch (error) {
      caveats.push(
        `Violation query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Layer 2 — coverage query
  const coverageEsql = definition.buildCoverageEsql(indexPattern);
  try {
    const coverageResult = await executeEsql({ query: coverageEsql, params, esClient });
    const count = toNumber(coverageResult.values?.[0]?.[0]);

    if (count > 0) {
      if (definition.verdict === 'rows_mean_violation') {
        status = 'GREEN';
        confidence = 'HIGH';
        evidenceCount = count;
        findings.push({
          check: `${definition.id} coverage check`,
          status: 'GREEN',
          detail: `${count} related events found with no violations detected for ${definition.name}.`,
          ...(includeEvidence
            ? {
                evidence: {
                  query: coverageEsql,
                  columns: coverageResult.columns,
                  values: coverageResult.values.slice(0, 10),
                },
              }
            : {}),
        });
      } else {
        status = 'GREEN';
        confidence = definition.buildViolationEsql ? 'HIGH' : 'MEDIUM';
        evidenceCount = count;
        caveats.push('Coverage data found but no specific violation check was run.');
        findings.push({
          check: `${definition.id} telemetry coverage`,
          status: 'GREEN',
          detail: `${count} matching events found for ${definition.name}.`,
        });
      }
      return buildResult(definition, status, confidence, findings, caveats, evidenceCount);
    }
  } catch (error) {
    caveats.push(
      `Coverage query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Layer 3 — preflight against mappings
  const preflight = await runPreflight(definition, indexPattern, esClient);
  if (preflight.confidence === 'NOT_ASSESSABLE') {
    status = 'NOT_ASSESSABLE';
    confidence = 'NOT_ASSESSABLE';
    findings.push({
      check: `${definition.id} data availability`,
      status: 'NOT_ASSESSABLE',
      detail: `Required fields are missing from the index: ${preflight.missingFields.join(
        ', '
      )}. Cannot assess this requirement.`,
    });
  } else {
    status = 'AMBER';
    confidence = preflight.confidence;
    const detail =
      preflight.missingFields.length > 0
        ? `Fields exist but no matching events found. Missing fields: ${preflight.missingFields.join(
            ', '
          )}.`
        : 'Fields exist in the index but no matching events found in the selected time range.';
    findings.push({
      check: `${definition.id} data availability`,
      status: 'AMBER',
      detail,
    });
    caveats.push(
      'No matching data in time range. Consider widening the time window or checking index patterns.'
    );
  }

  return buildResult(
    definition,
    status,
    confidence,
    findings,
    caveats,
    evidenceCount,
    preflight.missingFields
  );
}

/**
 * Default per-call concurrency for requirement evaluation.
 *
 * Each requirement issues at most 3 sequential ES|QL / field-caps round-trips (violation,
 * coverage, preflight). Running them 4-wide keeps a full PCI posture report (~20
 * requirements) under ~5× the latency of a single requirement while staying well below
 * Elasticsearch's default `indices.query.bool.max_clause_count` and the ES|QL task-queue
 * thresholds observed in `@kbn/evals-suite-pci-compliance` runs. Raise cautiously if the
 * target cluster has dedicated search capacity.
 */
export const PCI_REQUIREMENT_CONCURRENCY = 4;

/**
 * Concurrency-limited task runner that preserves input order in the result array.
 *
 * Used by the consolidated PCI tool so both check-mode and report-mode outputs are stable
 * regardless of which requirement finishes first.
 */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  if (limit <= 0) {
    throw new Error('runWithConcurrency: limit must be > 0');
  }
  const results: T[] = new Array(tasks.length);
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < tasks.length; i++) {
    const index = i;
    const p = tasks[index]().then((result) => {
      results[index] = result;
      executing.delete(p);
    });
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}
