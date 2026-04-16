/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { ElasticsearchClient } from '@kbn/core/server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import {
  type ComplianceStatus,
  type ComplianceConfidence,
  type PciRequirementDefinition,
  getIndexPattern,
  getTimeRangeForCheck,
  normalizeRequirementId,
  resolveRequirementIds,
  PCI_REQUIREMENTS,
} from './pci_compliance_requirements';

const pciComplianceCheckSchema = z.object({
  requirement: z
    .string()
    .describe(
      'PCI DSS requirement identifier. Use "all" for a full assessment, major requirements like "8", or sub-requirements like "8.3.4".'
    ),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional()
    .describe(
      'Optional ISO time range. If omitted, each check uses its recommended lookback period (e.g. 7 days for brute-force, 365 days for stale accounts).'
    ),
  indices: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Specify exact index patterns to avoid duplicate counts from overlapping patterns. ' +
        'Critical during re-indexing to prevent false results. Example: use "logs-okta.system-default" ' +
        'instead of "logs-*" when multiple indices contain the same events.'
    ),
  includeEvidence: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include tabular ES|QL evidence in findings. Defaults to true.'),
});

export const PCI_COMPLIANCE_CHECK_TOOL_ID = securityTool('pci_compliance_check');

interface RequirementCheckResult {
  requirement: string;
  name: string;
  pciReference: string;
  status: ComplianceStatus;
  confidence: ComplianceConfidence;
  summary: string;
  caveats: string[];
  findings: Array<{
    check: string;
    status: ComplianceStatus;
    detail: string;
    evidence?: {
      query: string;
      columns: Array<{ name: string; type: string }>;
      values: unknown[][];
    };
  }>;
  recommendations: string[];
  dataGaps: string[];
}

const CONCURRENCY_LIMIT = 4;

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  const executing: Set<Promise<void>> = new Set();

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

async function runPreflight(
  definition: PciRequirementDefinition,
  indexPattern: string,
  esClient: ElasticsearchClient
): Promise<{
  confidence: ComplianceConfidence;
  missingFields: string[];
  fieldFillRate?: number;
}> {
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

async function evaluateRequirement({
  requirementId,
  indexPattern,
  from,
  to,
  includeEvidence,
  esClient,
}: {
  requirementId: string;
  indexPattern: string;
  from: string;
  to: string;
  includeEvidence: boolean;
  esClient: ElasticsearchClient;
}): Promise<RequirementCheckResult> {
  const definition = PCI_REQUIREMENTS[requirementId];
  const caveats: string[] = [];
  let status: ComplianceStatus;
  let confidence: ComplianceConfidence;
  const findings: RequirementCheckResult['findings'] = [];

  // Layer 1: Run violation query if available
  if (definition.buildViolationEsql) {
    const violationEsql = definition.buildViolationEsql(indexPattern, from, to);
    try {
      const violationResult = await executeEsql({ query: violationEsql, esClient });
      const rowCount = violationResult.values?.length ?? 0;

      if (definition.verdict === 'rows_mean_violation' && rowCount > 0) {
        status = 'RED';
        confidence = 'HIGH';
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

        return buildResult(definition, status, confidence, findings, caveats);
      }

      if (definition.verdict === 'rows_mean_evidence' && rowCount > 0) {
        status = 'GREEN';
        confidence = 'HIGH';
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

        return buildResult(definition, status, confidence, findings, caveats);
      }
    } catch (error) {
      caveats.push(
        `Violation query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Layer 2: Run coverage query
  const coverageEsql = definition.buildCoverageEsql(indexPattern, from, to);
  try {
    const coverageResult = await executeEsql({ query: coverageEsql, esClient });
    const count = toNumber(coverageResult.values?.[0]?.[0]);

    if (count > 0) {
      if (definition.verdict === 'rows_mean_violation') {
        status = 'GREEN';
        confidence = 'HIGH';
        findings.push({
          check: `${definition.id} coverage check`,
          status: 'GREEN',
          detail: `${count} related events found with no violations detected for ${definition.name}.`,
          ...(includeEvidence
            ? { evidence: { query: coverageEsql, columns: coverageResult.columns, values: coverageResult.values.slice(0, 10) } }
            : {}),
        });
      } else {
        status = 'GREEN';
        confidence = 'MEDIUM';
        caveats.push('Coverage data found but no specific violation check was run.');
        findings.push({
          check: `${definition.id} telemetry coverage`,
          status: 'GREEN',
          detail: `${count} matching events found for ${definition.name}.`,
        });
      }
      return buildResult(definition, status, confidence, findings, caveats);
    }
  } catch (error) {
    caveats.push(
      `Coverage query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Layer 3: Preflight — check if fields even exist
  const preflight = await runPreflight(definition, indexPattern, esClient);
  if (preflight.confidence === 'NOT_ASSESSABLE') {
    status = 'NOT_ASSESSABLE';
    confidence = 'NOT_ASSESSABLE';
    findings.push({
      check: `${definition.id} data availability`,
      status: 'NOT_ASSESSABLE',
      detail: `Required fields are missing from the index: ${preflight.missingFields.join(', ')}. Cannot assess this requirement.`,
    });
  } else {
    status = 'AMBER';
    confidence = preflight.confidence;
    const detail =
      preflight.missingFields.length > 0
        ? `Fields exist but no matching events found. Missing fields: ${preflight.missingFields.join(', ')}.`
        : 'Fields exist in the index but no matching events found in the selected time range.';
    findings.push({
      check: `${definition.id} data availability`,
      status: 'AMBER',
      detail,
    });
    caveats.push('No matching data in time range. Consider widening the time window or checking index patterns.');
  }

  return buildResult(definition, status, confidence, findings, caveats);
}

function buildResult(
  definition: PciRequirementDefinition,
  status: ComplianceStatus,
  confidence: ComplianceConfidence,
  findings: RequirementCheckResult['findings'],
  caveats: string[]
): RequirementCheckResult {
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
    dataGaps: status === 'GREEN' ? [] : definition.requiredFields,
  };
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const pciComplianceCheckTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciComplianceCheckSchema> => {
  return {
    id: PCI_COMPLIANCE_CHECK_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Run PCI DSS v4.0.1 compliance checks with violation detection, data quality preflight, ' +
      'and confidence scoring. Supports individual requirements (e.g. "8.3.4"), top-level categories (e.g. "8"), or full assessments ("all").',
    schema: pciComplianceCheckSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ requirement, timeRange, indices, includeEvidence = true }, { esClient }) => {
      const normalized = normalizeRequirementId(requirement);
      if (!normalized) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Unsupported PCI requirement "${requirement}". Use "all", "1".."12", or sub-requirements like "8.3.4".`,
              },
            },
          ],
        };
      }

      const indexPattern = getIndexPattern(indices);
      const requirementIds = resolveRequirementIds(
        normalized === 'all' ? undefined : [normalized]
      );

      const tasks = requirementIds.map((reqId) => async () => {
        const { from, to } = getTimeRangeForCheck(reqId, timeRange);
        return evaluateRequirement({
          requirementId: reqId,
          indexPattern,
          from,
          to,
          includeEvidence,
          esClient: esClient.asCurrentUser,
        });
      });

      const requirementResults = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

      const statusCounts = requirementResults.reduce(
        (acc, result) => {
          acc[result.status] = (acc[result.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const overallStatus: ComplianceStatus =
        (statusCounts.RED ?? 0) > 0
          ? 'RED'
          : (statusCounts.AMBER ?? 0) > 0 || (statusCounts.NOT_ASSESSABLE ?? 0) > 0
          ? 'AMBER'
          : 'GREEN';

      const confidenceCounts = requirementResults.reduce(
        (acc, result) => {
          acc[result.confidence] = (acc[result.confidence] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      const overallConfidence: ComplianceConfidence =
        (confidenceCounts.NOT_ASSESSABLE ?? 0) > requirementResults.length / 2
          ? 'NOT_ASSESSABLE'
          : (confidenceCounts.LOW ?? 0) + (confidenceCounts.NOT_ASSESSABLE ?? 0) >
            requirementResults.length / 2
          ? 'LOW'
          : (confidenceCounts.HIGH ?? 0) >= requirementResults.length / 2
          ? 'HIGH'
          : 'MEDIUM';

      const results: Array<{
        type: ToolResultType;
        data: Record<string, unknown>;
        tool_result_id?: string;
      }> = [];

      const redFindings = requirementResults.filter((r) => r.status === 'RED');
      if (redFindings.length > 0) {
        const evidenceRows = redFindings.flatMap((r) =>
          r.findings
            .filter((f) => f.evidence && f.evidence.values.length > 0)
            .flatMap((f) => f.evidence!.values.map((row) => [r.requirement, r.name, ...row]))
        );

        if (evidenceRows.length > 0) {
          const firstEvidence = redFindings[0]?.findings.find((f) => f.evidence);
          const evidenceColumns = [
            { name: 'requirement', type: 'keyword' },
            { name: 'check', type: 'keyword' },
            ...(firstEvidence?.evidence?.columns ?? []),
          ];

          results.push({
            type: ToolResultType.query,
            data: { esql: 'PCI DSS v4.0.1 Compliance Violations' },
          });
          results.push({
            tool_result_id: getToolResultId(),
            type: ToolResultType.esqlResults,
            data: {
              query: 'PCI DSS v4.0.1 Compliance Check - Violations Found',
              columns: evidenceColumns,
              values: evidenceRows.slice(0, 100),
            },
          });
        }
      }

      results.push({
        type: ToolResultType.other,
        data: {
          request: {
            requirement,
            indices: indices ?? [...indexPattern.split(',')],
          },
          overallStatus,
          overallConfidence,
          statusCounts,
          requirementResults,
        },
      });

      return { results };
    },
    tags: ['security', 'compliance', 'pci', 'audit'],
  };
};
