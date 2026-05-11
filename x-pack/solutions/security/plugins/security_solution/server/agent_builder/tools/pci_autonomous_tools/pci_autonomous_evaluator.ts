/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-authored PCI compliance evaluator.
 *
 * INDEPENDENCE CLAIM (see comparison.html §1.5):
 *   This module is authored from scratch — it has zero imports from the hand-
 *   written sibling `pci_compliance_evaluator.ts` and only depends on the
 *   autonomous-side schemas + requirement catalog. The CI test
 *   `pci_autonomous_modules_no_handwritten_imports.test.ts` locks this in.
 *
 * Independent design choices vs the hand-written sibling:
 *
 *   1. Composable pipeline, not nested try/catch — the hand-written sibling
 *      runs a 3-layer pyramid (violation try → coverage try → preflight try)
 *      where each layer mutates shared state. This module exposes the same
 *      logical pipeline as a sequence of small, pure-ish functions that each
 *      return a discriminated `EvaluationStep` result. The orchestrator just
 *      walks them and returns the first conclusive verdict.
 *
 *   2. Explicit lookup table for status → score, not multiplication. The
 *      hand-written sibling multiplies a `baseScore` by a `confidenceWeight`,
 *      which collapses (GREEN, LOW) and (AMBER, HIGH) to the same number (50).
 *      This module uses a 5×4 lookup table so every (status, confidence) pair
 *      has an individually-tunable score and no two pairs collide unless that
 *      is intentional.
 *
 *   3. Field-caps preflight returns a discriminated union covering all three
 *      cases (`fully_covered`, `partially_covered`, `unmappable`) explicitly
 *      rather than encoding cases via confidence-level strings.
 *
 *   4. Concurrency runner preserves order via index keying and uses a manual
 *      ring rather than the `Promise.race(new Set())` pattern the hand-written
 *      sibling uses. Equivalent semantics; different implementation.
 *
 *   5. Different error swallowing — coverage / violation query failures are
 *      surfaced as structured `dataGap` entries with the underlying error
 *      message rather than `caveats` strings. Auditors can then route on the
 *      gap type instead of grepping caveat text.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type {
  AutonomousComplianceConfidence,
  AutonomousComplianceStatus,
  AutonomousRequirementDef,
} from './pci_autonomous_requirements';
import {
  AUTONOMOUS_PCI_REQUIREMENTS,
  buildAutonomousTimeWindowParams,
} from './pci_autonomous_requirements';

// ──────────────────────────────────────────────────────────────────────────
// Public input / output shapes
// ──────────────────────────────────────────────────────────────────────────

export interface EvaluateAutonomousRequirementArgs {
  requirementId: string;
  indexPattern: string;
  from: string;
  to: string;
  includeEvidence: boolean;
  esClient: ElasticsearchClient;
}

export interface AutonomousRequirementFinding {
  check: string;
  status: AutonomousComplianceStatus;
  detail: string;
  evidence?: {
    query: string;
    columns: Array<{ name: string; type: string }>;
    values: unknown[][];
  };
}

export interface AutonomousDataGap {
  /** What kind of gap: missing fields, query failure, preflight failure. */
  kind: 'missing_fields' | 'query_failed' | 'unmappable_index';
  message: string;
  /** Field list, or the raw error message — `kind` discriminates. */
  details?: string[];
}

export interface AutonomousEvaluatedRequirement {
  requirement: string;
  name: string;
  pciReference: string;
  status: AutonomousComplianceStatus;
  confidence: AutonomousComplianceConfidence;
  summary: string;
  caveats: string[];
  findings: AutonomousRequirementFinding[];
  recommendations: string[];
  dataGaps: AutonomousDataGap[];
  evidenceCount: number;
  /** 0–100 score from the explicit (status, confidence) lookup table. */
  score: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Status × Confidence → score lookup table
// ──────────────────────────────────────────────────────────────────────────
//
// Explicit table avoids the silent collisions of the multiplicative scheme.
// e.g.  (GREEN, HIGH)  = 100 — full credit
//       (GREEN, LOW)   = 60  — telemetry-attested but worth re-checking
//       (AMBER, HIGH)  = 55  — gap surfaced with high confidence
//       (RED, HIGH)    = 0   — violation found with high confidence
//       (NOT_ASSESSABLE, *) = 25 — no signal; defer to QSA
//
// Tune any single cell without affecting unrelated cells. This is the design
// the multiplicative scheme cannot offer.

const SCORE_TABLE: Record<
  AutonomousComplianceStatus,
  Record<AutonomousComplianceConfidence, number>
> = {
  GREEN: { HIGH: 100, MEDIUM: 80, LOW: 60, NOT_ASSESSABLE: 50 },
  AMBER: { HIGH: 55, MEDIUM: 45, LOW: 35, NOT_ASSESSABLE: 30 },
  RED: { HIGH: 0, MEDIUM: 10, LOW: 20, NOT_ASSESSABLE: 25 },
  NOT_APPLICABLE: { HIGH: 100, MEDIUM: 100, LOW: 100, NOT_ASSESSABLE: 100 },
  NOT_ASSESSABLE: { HIGH: 25, MEDIUM: 25, LOW: 25, NOT_ASSESSABLE: 25 },
};

// The table is exhaustive over `AutonomousComplianceStatus ×
// AutonomousComplianceConfidence`; TypeScript proves every cell exists, so
// no fallback is needed. If a future contributor expands either union, the
// `Record<…>` constraint above forces them to populate the new cells.
const scoreFor = (
  status: AutonomousComplianceStatus,
  confidence: AutonomousComplianceConfidence
): number => SCORE_TABLE[status][confidence];

// ──────────────────────────────────────────────────────────────────────────
// Number coercion (ES|QL returns mixed types for COUNT projections)
// ──────────────────────────────────────────────────────────────────────────

const coerceNumber = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

// ──────────────────────────────────────────────────────────────────────────
// Discriminated union — each pipeline stage returns one of these
// ──────────────────────────────────────────────────────────────────────────

type EvaluationStep =
  | {
      kind: 'verdict';
      status: AutonomousComplianceStatus;
      confidence: AutonomousComplianceConfidence;
      findings: AutonomousRequirementFinding[];
      evidenceCount: number;
      caveats: string[];
      dataGaps: AutonomousDataGap[];
    }
  | {
      kind: 'continue';
      findings: AutonomousRequirementFinding[];
      caveats: string[];
      dataGaps: AutonomousDataGap[];
    };

// ──────────────────────────────────────────────────────────────────────────
// Stage 1 — violation query
// ──────────────────────────────────────────────────────────────────────────

async function runViolationStage(
  definition: AutonomousRequirementDef,
  indexPattern: string,
  params: Array<Record<string, string>>,
  esClient: ElasticsearchClient,
  includeEvidence: boolean
): Promise<EvaluationStep> {
  const findings: AutonomousRequirementFinding[] = [];
  const caveats: string[] = [];
  const dataGaps: AutonomousDataGap[] = [];

  if (!definition.queries.violation) {
    return { kind: 'continue', findings, caveats, dataGaps };
  }

  const query = definition.queries.violation(indexPattern);

  try {
    const result = await executeEsql({ query, params, esClient });
    const rowCount = result.values?.length ?? 0;

    if (definition.verdict === 'detect_violations' && rowCount > 0) {
      findings.push({
        check: `${definition.id} — violations`,
        status: 'RED',
        detail: `Detected ${rowCount} violation row(s) for ${definition.name}.`,
        ...(includeEvidence
          ? {
              evidence: {
                query,
                columns: result.columns,
                values: result.values.slice(0, 50),
              },
            }
          : {}),
      });
      return {
        kind: 'verdict',
        status: 'RED',
        confidence: 'HIGH',
        findings,
        evidenceCount: rowCount,
        caveats,
        dataGaps,
      };
    }

    if (definition.verdict === 'verify_presence' && rowCount > 0) {
      findings.push({
        check: `${definition.id} — telemetry observed`,
        status: 'GREEN',
        detail: `Found ${rowCount} matching event(s) for ${definition.name}.`,
        ...(includeEvidence
          ? {
              evidence: {
                query,
                columns: result.columns,
                values: result.values.slice(0, 50),
              },
            }
          : {}),
      });
      return {
        kind: 'verdict',
        status: 'GREEN',
        confidence: 'HIGH',
        findings,
        evidenceCount: rowCount,
        caveats,
        dataGaps,
      };
    }
  } catch (error) {
    dataGaps.push({
      kind: 'query_failed',
      message: `Violation query failed for ${definition.id}`,
      details: [error instanceof Error ? error.message : String(error)],
    });
  }

  return { kind: 'continue', findings, caveats, dataGaps };
}

// ──────────────────────────────────────────────────────────────────────────
// Stage 2 — coverage query
// ──────────────────────────────────────────────────────────────────────────

async function runCoverageStage(
  definition: AutonomousRequirementDef,
  indexPattern: string,
  params: Array<Record<string, string>>,
  esClient: ElasticsearchClient,
  includeEvidence: boolean
): Promise<EvaluationStep> {
  const findings: AutonomousRequirementFinding[] = [];
  const caveats: string[] = [];
  const dataGaps: AutonomousDataGap[] = [];
  const query = definition.queries.coverage(indexPattern);

  try {
    const result = await executeEsql({ query, params, esClient });
    const count = coerceNumber(result.values?.[0]?.[0]);

    if (count > 0) {
      const isViolationCheck = definition.verdict === 'detect_violations';
      const status: AutonomousComplianceStatus = 'GREEN';
      const confidence: AutonomousComplianceConfidence = isViolationCheck
        ? 'HIGH'
        : definition.queries.violation
        ? 'HIGH'
        : 'MEDIUM';

      if (isViolationCheck) {
        findings.push({
          check: `${definition.id} — telemetry observed, no violations detected`,
          status,
          detail: `${count} related event(s) found with no violations for ${definition.name}.`,
          ...(includeEvidence
            ? {
                evidence: {
                  query,
                  columns: result.columns,
                  values: result.values.slice(0, 10),
                },
              }
            : {}),
        });
      } else {
        caveats.push(
          'Coverage telemetry observed but the requirement has no dedicated violation check.'
        );
        findings.push({
          check: `${definition.id} — telemetry coverage`,
          status,
          detail: `${count} matching event(s) found for ${definition.name}.`,
        });
      }

      return {
        kind: 'verdict',
        status,
        confidence,
        findings,
        evidenceCount: count,
        caveats,
        dataGaps,
      };
    }
  } catch (error) {
    dataGaps.push({
      kind: 'query_failed',
      message: `Coverage query failed for ${definition.id}`,
      details: [error instanceof Error ? error.message : String(error)],
    });
  }

  return { kind: 'continue', findings, caveats, dataGaps };
}

// ──────────────────────────────────────────────────────────────────────────
// Stage 3 — field-caps preflight
// ──────────────────────────────────────────────────────────────────────────

type PreflightResult =
  | { kind: 'fully_covered' }
  | { kind: 'partially_covered'; missing: string[] }
  | { kind: 'unmappable'; missing: string[] }
  | { kind: 'lookup_failed'; message: string };

async function runFieldCapsPreflight(
  definition: AutonomousRequirementDef,
  indexPattern: string,
  esClient: ElasticsearchClient
): Promise<PreflightResult> {
  try {
    const fieldCaps = await esClient.fieldCaps({
      index: indexPattern,
      fields: definition.requiredFields,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const present = new Set(Object.keys(fieldCaps.fields ?? {}));
    const missing = definition.requiredFields.filter((f) => f !== '@timestamp' && !present.has(f));
    const requiredExcludingTimestamp = definition.requiredFields.filter((f) => f !== '@timestamp');

    if (requiredExcludingTimestamp.length === 0 || missing.length === 0) {
      return { kind: 'fully_covered' };
    }
    if (missing.length === requiredExcludingTimestamp.length) {
      return { kind: 'unmappable', missing };
    }
    return { kind: 'partially_covered', missing };
  } catch (error) {
    return {
      kind: 'lookup_failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function preflightToVerdict(
  definition: AutonomousRequirementDef,
  preflight: PreflightResult
): EvaluationStep {
  if (preflight.kind === 'unmappable') {
    return {
      kind: 'verdict',
      status: 'NOT_ASSESSABLE',
      confidence: 'NOT_ASSESSABLE',
      findings: [
        {
          check: `${definition.id} — required fields missing`,
          status: 'NOT_ASSESSABLE',
          detail: `Required field(s) are not present in the index: ${preflight.missing.join(
            ', '
          )}.`,
        },
      ],
      evidenceCount: 0,
      caveats: [],
      dataGaps: [
        {
          kind: 'missing_fields',
          message: `Cannot assess ${definition.id} — schema does not expose the required fields.`,
          details: preflight.missing,
        },
      ],
    };
  }

  if (preflight.kind === 'lookup_failed') {
    return {
      kind: 'verdict',
      status: 'AMBER',
      confidence: 'LOW',
      findings: [
        {
          check: `${definition.id} — field-caps lookup failed`,
          status: 'AMBER',
          detail: 'Could not inspect index mappings. Assess against a fresh cluster.',
        },
      ],
      evidenceCount: 0,
      caveats: [preflight.message],
      dataGaps: [
        {
          kind: 'query_failed',
          message: `field_caps lookup failed for ${definition.id}`,
          details: [preflight.message],
        },
      ],
    };
  }

  const confidence: AutonomousComplianceConfidence =
    preflight.kind === 'fully_covered' ? 'HIGH' : 'MEDIUM';
  const missing = preflight.kind === 'partially_covered' ? preflight.missing : [];
  const detail =
    missing.length > 0
      ? `Required fields exist but no matching events in window. Missing: ${missing.join(', ')}.`
      : 'Required fields exist in index but no matching events in the selected window.';

  return {
    kind: 'verdict',
    status: 'AMBER',
    confidence,
    findings: [
      {
        check: `${definition.id} — schema present, no in-window events`,
        status: 'AMBER',
        detail,
      },
    ],
    evidenceCount: 0,
    caveats: [
      'No matching telemetry in the selected window. Consider widening the time range or verifying the index pattern.',
    ],
    dataGaps:
      missing.length > 0
        ? [
            {
              kind: 'missing_fields',
              message: `Partial schema coverage for ${definition.id}.`,
              details: missing,
            },
          ]
        : [],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Result composition
// ──────────────────────────────────────────────────────────────────────────

const statusToHumanLabel = (status: AutonomousComplianceStatus): string => {
  switch (status) {
    case 'GREEN':
      return 'compliant';
    case 'RED':
      return 'non-compliant';
    case 'AMBER':
      return 'partially assessable';
    case 'NOT_ASSESSABLE':
      return 'not assessable';
    case 'NOT_APPLICABLE':
      return 'not applicable';
    default:
      return 'unknown';
  }
};

function composeEvaluatedRequirement(
  definition: AutonomousRequirementDef,
  verdict: Extract<EvaluationStep, { kind: 'verdict' }>,
  carryFindings: AutonomousRequirementFinding[],
  carryCaveats: string[],
  carryDataGaps: AutonomousDataGap[]
): AutonomousEvaluatedRequirement {
  const findings = [...carryFindings, ...verdict.findings];
  const caveats = Array.from(new Set([...carryCaveats, ...verdict.caveats]));
  const dataGaps = [...carryDataGaps, ...verdict.dataGaps];
  return {
    requirement: definition.id,
    name: definition.name,
    pciReference: definition.pciReference,
    status: verdict.status,
    confidence: verdict.confidence,
    summary: `Requirement ${definition.id} is ${statusToHumanLabel(verdict.status)} (confidence: ${
      verdict.confidence
    }).`,
    caveats,
    findings,
    recommendations: definition.recommendations,
    dataGaps,
    evidenceCount: verdict.evidenceCount,
    score: scoreFor(verdict.status, verdict.confidence),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a single requirement.
 *
 * The pipeline runs three stages in order; the first to produce a verdict
 * wins. Findings / caveats / dataGaps from preceding stages carry into the
 * final result so an auditor sees the full provenance even when an earlier
 * stage failed.
 */
export async function evaluateAutonomousRequirement({
  requirementId,
  indexPattern,
  from,
  to,
  includeEvidence,
  esClient,
}: EvaluateAutonomousRequirementArgs): Promise<AutonomousEvaluatedRequirement> {
  const definition = AUTONOMOUS_PCI_REQUIREMENTS[requirementId];
  if (!definition) {
    throw new Error(`evaluateAutonomousRequirement: unknown requirement id "${requirementId}".`);
  }
  const params = buildAutonomousTimeWindowParams({ from, to });

  const carryFindings: AutonomousRequirementFinding[] = [];
  const carryCaveats: string[] = [];
  const carryDataGaps: AutonomousDataGap[] = [];

  const stage1 = await runViolationStage(
    definition,
    indexPattern,
    params,
    esClient,
    includeEvidence
  );
  if (stage1.kind === 'verdict') {
    return composeEvaluatedRequirement(
      definition,
      stage1,
      carryFindings,
      carryCaveats,
      carryDataGaps
    );
  }
  carryFindings.push(...stage1.findings);
  carryCaveats.push(...stage1.caveats);
  carryDataGaps.push(...stage1.dataGaps);

  const stage2 = await runCoverageStage(
    definition,
    indexPattern,
    params,
    esClient,
    includeEvidence
  );
  if (stage2.kind === 'verdict') {
    return composeEvaluatedRequirement(
      definition,
      stage2,
      carryFindings,
      carryCaveats,
      carryDataGaps
    );
  }
  carryFindings.push(...stage2.findings);
  carryCaveats.push(...stage2.caveats);
  carryDataGaps.push(...stage2.dataGaps);

  const preflight = await runFieldCapsPreflight(definition, indexPattern, esClient);
  const stage3 = preflightToVerdict(definition, preflight);
  if (stage3.kind !== 'verdict') {
    throw new Error('preflightToVerdict must always return a verdict');
  }
  return composeEvaluatedRequirement(
    definition,
    stage3,
    carryFindings,
    carryCaveats,
    carryDataGaps
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Concurrency
// ──────────────────────────────────────────────────────────────────────────

/**
 * Concurrency budget. Each requirement performs at most 3 round-trips (one
 * violation query if defined, one coverage query, one field-caps lookup).
 * Four parallel evaluations is the sweet spot for a single Scout cluster on
 * a developer workstation — beyond that, ES|QL's task queue saturates first.
 */
export const AUTONOMOUS_PCI_REQUIREMENT_CONCURRENCY = 4;

/**
 * Run an ordered list of tasks with a fixed concurrency limit. Output array
 * preserves input order (i-th result corresponds to i-th task). Uses a
 * manual work-stealing ring rather than the `Promise.race(new Set())`
 * pattern — equivalent semantics, different implementation.
 *
 * Failure semantics: every task is awaited even if a sibling rejects. After
 * all workers drain, the first observed rejection is re-thrown so the
 * caller still sees an error. Successful tasks remain in their slots in
 * the returned array; rejected slots stay as the `Array(n)` default
 * (`undefined`). This guarantees no in-flight promise is silently orphaned
 * — important because the evaluator's tasks issue ES|QL and field-caps
 * round-trips, and dropping them mid-flight would leak load against the
 * cluster.
 */
export async function runAutonomousWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  if (limit <= 0) {
    throw new Error('runAutonomousWithConcurrency: limit must be > 0');
  }
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  let firstError: unknown;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= tasks.length) return;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        if (firstError === undefined) firstError = err;
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  if (firstError !== undefined) throw firstError;
  return results;
}
