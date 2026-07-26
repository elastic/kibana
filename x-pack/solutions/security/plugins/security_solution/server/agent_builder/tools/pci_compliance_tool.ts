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
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import {
  type ComplianceStatus,
  type ComplianceConfidence,
  getIndexList,
  getIndexPattern,
  getTimeRangeForCheck,
  normalizeRequirementId,
  resolveRequirementIds,
  PCI_REQUIREMENTS,
} from './pci_compliance_requirements';
import {
  pciIndexPatternSchema,
  pciRequirementIdSchema,
  pciTimeRangeSchema,
  buildScopeClaim,
} from './pci_compliance_schemas';
import {
  type EvaluatedRequirement,
  evaluateRequirement,
  runWithConcurrency,
  PCI_REQUIREMENT_CONCURRENCY,
} from './pci_compliance_evaluator';

const REPORT_FORMATS = ['summary', 'detailed', 'executive'] as const;

const pciComplianceSchema = z
  .object({
    mode: z
      .enum(['check', 'report'])
      .describe(
        '`check` runs violation + coverage + preflight for one or more requirements and returns findings with evidence. ' +
          '`report` produces a roll-up scorecard (RED/AMBER/GREEN + confidence + score) across the requested set. ' +
          'Use `check` when you need actionable findings; use `report` when you need a posture snapshot.'
      ),
    requirements: z
      .array(pciRequirementIdSchema)
      .min(1)
      .optional()
      .describe(
        'Requirement identifiers to evaluate. Accepts "all", top-level ("1".."12"), or sub-requirements ("8.3.4"). ' +
          'Defaults to ["all"].'
      ),
    timeRange: pciTimeRangeSchema
      .optional()
      .describe(
        'Optional ISO-8601 time range (`from` must be <= `to`). If omitted, each requirement ' +
          'uses its recommended lookback window (e.g. 7 days for brute-force, 365 days for stale accounts).'
      ),
    indices: z
      .array(pciIndexPatternSchema)
      .min(1)
      .optional()
      .describe(
        'Index patterns to query. Specify exact patterns to avoid overlap/double-counting during ' +
          're-indexing. Defaults to logs-*, metrics-*, endgame-*.'
      ),
    includeEvidence: z
      .boolean()
      .optional()
      .default(true)
      .describe('[check mode] Include tabular ES|QL evidence in findings. Ignored in report mode.'),
    format: z
      .enum(REPORT_FORMATS)
      .optional()
      .default('summary')
      .describe('[report mode] Report depth: summary, detailed, or executive.'),
    includeRecommendations: z
      .boolean()
      .optional()
      .default(true)
      .describe('[report mode] Include recommendation text on each requirement row.'),
  })
  .describe(
    'Run PCI DSS v4.0.1 compliance checks (`mode: check`) or generate a compliance report (`mode: report`). ' +
      'One tool replaces the prior pci_compliance_check / pci_compliance_report pair.'
  );

export const PCI_COMPLIANCE_TOOL_ID = securityTool('pci_compliance');

const scoreToStatus = (score: number): ComplianceStatus => {
  if (score >= 85) return 'GREEN';
  if (score >= 60) return 'AMBER';
  return 'RED';
};

const rollupConfidence = (rows: EvaluatedRequirement[]): ComplianceConfidence => {
  if (rows.length === 0) return 'NOT_ASSESSABLE';
  const counts = rows.reduce((acc, r) => {
    acc[r.confidence] = (acc[r.confidence] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  if ((counts.NOT_ASSESSABLE ?? 0) > rows.length / 2) return 'NOT_ASSESSABLE';
  if ((counts.LOW ?? 0) + (counts.NOT_ASSESSABLE ?? 0) > rows.length / 2) return 'LOW';
  if ((counts.HIGH ?? 0) >= rows.length / 2) return 'HIGH';
  return 'MEDIUM';
};

const rollupOverallStatus = (rows: EvaluatedRequirement[]): ComplianceStatus => {
  const statusCounts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  if ((statusCounts.RED ?? 0) > 0) return 'RED';
  if ((statusCounts.AMBER ?? 0) > 0 || (statusCounts.NOT_ASSESSABLE ?? 0) > 0) return 'AMBER';
  return 'GREEN';
};

/**
 * Consolidated PCI DSS v4.0.1 compliance tool.
 *
 * Security properties:
 *  1. `timeRange.from` / `timeRange.to` are validated as ISO-8601 with a `from <= to` refinement
 *     and bound into ES|QL via `?_tstart` / `?_tend` named parameters — never interpolated.
 *  2. Index patterns are validated against a strict regex before being placed into the ES|QL
 *     `FROM` clause (which cannot be parameterised today).
 *  3. `requirements` entries are validated against the enum of known requirement IDs plus
 *     the sentinel `"all"`. Unknown IDs are rejected at the schema boundary.
 *
 * Every response includes a `scopeClaim` object citing the DSS version, the indices and
 * time range that were actually evaluated, the requirement IDs that were run, the fields
 * that were checked, and a QSA disclaimer so downstream consumers can cite provenance.
 */
export const pciComplianceTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciComplianceSchema> => {
  return {
    id: PCI_COMPLIANCE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Run PCI DSS v4.0.1 compliance checks or reports. Mode "check" returns per-requirement ' +
      'findings with ES|QL evidence. Mode "report" returns a visual scorecard with confidence-weighted ' +
      'scores across the requested requirements. All responses include a scopeClaim describing which ' +
      'indices, time range, and requirement IDs were actually evaluated.',
    schema: pciComplianceSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        mode,
        requirements,
        timeRange,
        indices,
        includeEvidence = true,
        format = 'summary',
        includeRecommendations = true,
      },
      { esClient }
    ) => {
      const requestedRaw = requirements && requirements.length > 0 ? requirements : ['all'];

      const normalizedRaw = requestedRaw.map((req) => normalizeRequirementId(req));
      if (normalizedRaw.some((id) => id === null)) {
        const invalid = requestedRaw.filter((_, i) => normalizedRaw[i] === null);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Unsupported PCI requirement(s): ${invalid.join(
                  ', '
                )}. Use "all", top-level ("1".."12"), or sub-requirements like "8.3.4".`,
              },
            },
          ],
        };
      }

      const requestedIds = normalizedRaw.filter((id): id is string => id !== null);
      const wantAll = requestedIds.includes('all');
      const requirementIds = resolveRequirementIds(
        wantAll ? undefined : Array.from(new Set(requestedIds))
      );

      if (requirementIds.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'No PCI DSS requirements resolved for evaluation.' },
            },
          ],
        };
      }

      const indexList = getIndexList(indices);
      const indexPattern = getIndexPattern(indices);

      const tasks = requirementIds.map((reqId) => async () => {
        const { from, to } = getTimeRangeForCheck(reqId, timeRange);
        return evaluateRequirement({
          requirementId: reqId,
          indexPattern,
          from,
          to,
          includeEvidence: mode === 'check' ? includeEvidence : false,
          esClient: esClient.asCurrentUser,
        });
      });

      const rows = await runWithConcurrency(tasks, PCI_REQUIREMENT_CONCURRENCY);

      const requiredFieldsChecked = Array.from(
        new Set(requirementIds.flatMap((id) => PCI_REQUIREMENTS[id]?.requiredFields ?? []))
      );

      const resolvedTimeRange =
        timeRange ??
        (() => {
          const ranges = requirementIds.map((id) => getTimeRangeForCheck(id));
          const from = ranges.reduce(
            (earliest, r) => (r.from < earliest ? r.from : earliest),
            ranges[0].from
          );
          const to = ranges.reduce((latest, r) => (r.to > latest ? r.to : latest), ranges[0].to);
          return { from, to };
        })();

      const scopeClaim = buildScopeClaim({
        indices: indexList,
        from: resolvedTimeRange.from,
        to: resolvedTimeRange.to,
        requirementsEvaluated: requirementIds,
        requiredFieldsChecked,
      });

      if (mode === 'check') {
        return buildCheckResponse({
          rows,
          scopeClaim,
          indexPattern,
          indexList,
          requirements: requestedRaw,
          timeRange,
        });
      }

      return buildReportResponse({
        rows,
        scopeClaim,
        indexPattern,
        format,
        includeRecommendations,
      });
    },
    tags: ['security', 'compliance', 'pci', 'audit'],
  };
};

function buildCheckResponse({
  rows,
  scopeClaim,
  indexPattern,
  indexList,
  requirements,
  timeRange,
}: {
  rows: EvaluatedRequirement[];
  scopeClaim: ReturnType<typeof buildScopeClaim>;
  indexPattern: string;
  indexList: string[];
  requirements: string[];
  timeRange?: { from: string; to: string };
}) {
  const statusCounts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const overallStatus = rollupOverallStatus(rows);
  const overallConfidence = rollupConfidence(rows);

  const results: Array<{
    type: ToolResultType;
    data: Record<string, unknown>;
    tool_result_id?: string;
  }> = [];

  const redFindings = rows.filter((r) => r.status === 'RED');
  for (const row of redFindings) {
    for (const finding of row.findings) {
      if (finding.evidence && finding.evidence.values.length > 0) {
        const { from, to } = getTimeRangeForCheck(row.requirement, timeRange);
        results.push({
          tool_result_id: getToolResultId(),
          type: ToolResultType.esqlResults,
          data: {
            query: finding.evidence.query,
            columns: finding.evidence.columns,
            values: finding.evidence.values,
            time_range: { from, to },
          },
        });
      }
    }
  }

  results.push({
    type: ToolResultType.other,
    data: {
      mode: 'check',
      request: { requirements, indices: indexList, indexPattern },
      overallStatus,
      overallConfidence,
      statusCounts,
      requirementResults: rows,
      scopeClaim,
    },
  });

  return { results };
}

function buildReportResponse({
  rows,
  scopeClaim,
  indexPattern,
  format,
  includeRecommendations,
}: {
  rows: EvaluatedRequirement[];
  scopeClaim: ReturnType<typeof buildScopeClaim>;
  indexPattern: string;
  format: (typeof REPORT_FORMATS)[number];
  includeRecommendations: boolean;
}) {
  const overallScore =
    rows.length === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length);
  const overallStatus = scoreToStatus(overallScore);
  const overallConfidence = rollupConfidence(rows);

  const greenCount = rows.filter((r) => r.status === 'GREEN').length;
  const amberCount = rows.filter((r) => r.status === 'AMBER').length;
  const redCount = rows.filter((r) => r.status === 'RED').length;
  const notAssessableCount = rows.filter((r) => r.status === 'NOT_ASSESSABLE').length;

  const scorecardColumns = [
    { name: 'Requirement', type: 'keyword' },
    { name: 'Check', type: 'keyword' },
    { name: 'Status', type: 'keyword' },
    { name: 'Confidence', type: 'keyword' },
    { name: 'Score', type: 'long' },
    { name: 'Findings', type: 'long' },
  ];
  const scorecardValues = rows.map((r) => [
    r.requirement,
    r.name,
    r.status,
    r.confidence,
    r.score,
    r.evidenceCount,
  ]);

  const scorecardQuery = `ROW overall_score = ${overallScore}, status = "${overallStatus}", green = ${greenCount}, amber = ${amberCount}, red = ${redCount}, not_assessable = ${notAssessableCount}`;

  const results: Array<{
    type: ToolResultType;
    data: Record<string, unknown>;
    tool_result_id?: string;
  }> = [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.esqlResults,
      data: {
        query: scorecardQuery,
        columns: scorecardColumns,
        values: scorecardValues,
      },
    },
  ];

  const requirementRows = rows.map((row) => ({
    id: row.requirement,
    name: row.name,
    pciReference: row.pciReference,
    status: row.status,
    confidence: row.confidence,
    score: row.score,
    evidenceCount: row.evidenceCount,
    topFindings: row.findings.map((f) => f.detail),
    recommendations: includeRecommendations ? row.recommendations : [],
  }));

  results.push({
    type: ToolResultType.other,
    data: {
      mode: 'report',
      format,
      generatedAt: new Date().toISOString(),
      overallScore,
      overallStatus,
      overallConfidence,
      summary: `PCI DSS v4.0.1 posture is ${overallStatus} with score ${overallScore}/100. Requirements: ${greenCount} GREEN, ${amberCount} AMBER, ${redCount} RED, ${notAssessableCount} NOT ASSESSABLE.`,
      requirements:
        format === 'executive'
          ? requirementRows.map(({ id, name, status, confidence, score, evidenceCount }) => ({
              id,
              name,
              status,
              confidence,
              score,
              evidenceCount,
            }))
          : requirementRows,
      dataCoverage: {
        indexPattern,
        totalRequirements: requirementRows.length,
        greenCount,
        amberCount,
        redCount,
        notAssessableCount,
      },
      scopeClaim,
    },
  });

  return { results };
}
