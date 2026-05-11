/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-architected PCI DSS scorecard report tool.
 *
 * Sibling of `pci_autonomous_compliance_check`. The autonomous architect's blueprint kept
 * "produce a per-requirement scorecard / executive roll-up" as a tool distinct from
 * "produce per-requirement findings with evidence" — the argument being that scorecard
 * production has different defaults (format depth, recommendations, no per-finding ES|QL
 * evidence) and the LLM routes more reliably between two narrow tools than one mode-
 * parameterised one.
 *
 * INDEPENDENCE CLAIM (see comparison.html §1.5): this tool now imports only from the
 * autonomously-authored engine modules (`pci_autonomous_requirements`,
 * `pci_autonomous_evaluator`, `pci_autonomous_schemas`). It has ZERO imports from the
 * hand-written sibling's `pci_compliance_*` modules.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { securityTool } from '../constants';
import {
  type AutonomousComplianceStatus,
  type AutonomousComplianceConfidence,
  AUTONOMOUS_PCI_REQUIREMENTS,
  getAutonomousIndexList,
  getAutonomousIndexPattern,
  getAutonomousTimeRangeForCheck,
  resolveAutonomousRequirementIds,
} from './pci_autonomous_requirements';
import {
  pciAutonomousIndexPatternSchema,
  pciAutonomousTimeRangeSchema,
  buildAutonomousScopeClaim,
} from './pci_autonomous_schemas';
import {
  type AutonomousEvaluatedRequirement,
  evaluateAutonomousRequirement,
  runAutonomousWithConcurrency,
  AUTONOMOUS_PCI_REQUIREMENT_CONCURRENCY,
} from './pci_autonomous_evaluator';

const REPORT_FORMATS = ['summary', 'detailed', 'executive'] as const;

const pciAutonomousScorecardReportSchema = z
  .object({
    timeRange: pciAutonomousTimeRangeSchema
      .optional()
      .describe(
        'Optional ISO-8601 time range (`from` <= `to`). If omitted, each requirement uses its ' +
          'recommended lookback window.'
      ),
    indices: z
      .array(pciAutonomousIndexPatternSchema)
      .min(1)
      .optional()
      .describe('Index patterns to query. Defaults to logs-*, endgame-*, winlogbeat-*.'),
    format: z
      .enum(REPORT_FORMATS)
      .optional()
      .default('summary')
      .describe(
        'Report depth: `summary` (default — concise findings + recommendations), `detailed` ' +
          '(full evaluator output), `executive` (compact scorecard row per requirement, no ' +
          'findings prose).'
      ),
    includeRecommendations: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include recommendation text on each requirement row.'),
  })
  .describe(
    'Produce a PCI DSS v4.0.1 posture scorecard rolling up RED/AMBER/GREEN/NOT_ASSESSABLE ' +
      'verdicts across all 12 requirements with a confidence-weighted overall score. For per- ' +
      'requirement findings with evidence, use the sibling pci_autonomous_compliance_check tool.'
  );

export const PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID = securityTool(
  'pci_autonomous_scorecard_report'
);

const scoreToStatus = (score: number): AutonomousComplianceStatus => {
  if (score >= 85) return 'GREEN';
  if (score >= 60) return 'AMBER';
  return 'RED';
};

const rollupConfidence = (rows: AutonomousEvaluatedRequirement[]): AutonomousComplianceConfidence => {
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

export const pciAutonomousScorecardReportTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciAutonomousScorecardReportSchema> => {
  return {
    id: PCI_AUTONOMOUS_SCORECARD_REPORT_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Autonomous-variant PCI DSS v4.0.1 scorecard REPORT. Roll up RED/AMBER/GREEN/' +
      'NOT_ASSESSABLE verdicts across all 12 requirements with a confidence-weighted overall ' +
      'score (0-100), per-requirement findings table, and recommendations. Use this for an ' +
      'executive posture snapshot. For actionable per-requirement evidence use the sibling ' +
      'pci_autonomous_compliance_check tool — the autonomous architect split scorecard ' +
      'generation and requirement-specific checks into two specialised tools.',
    schema: pciAutonomousScorecardReportSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { timeRange, indices, format = 'summary', includeRecommendations = true },
      { esClient }
    ) => {
      const requirementIds = resolveAutonomousRequirementIds(undefined);

      const indexList = getAutonomousIndexList(indices);
      const indexPattern = getAutonomousIndexPattern(indices);

      const tasks = requirementIds.map((reqId) => async () => {
        const { from, to } = getAutonomousTimeRangeForCheck(reqId, timeRange);
        return evaluateAutonomousRequirement({
          requirementId: reqId,
          indexPattern,
          from,
          to,
          includeEvidence: false,
          esClient: esClient.asCurrentUser,
        });
      });

      const rows = await runAutonomousWithConcurrency(tasks, AUTONOMOUS_PCI_REQUIREMENT_CONCURRENCY);

      const requiredFieldsChecked = Array.from(
        new Set(requirementIds.flatMap((id) => AUTONOMOUS_PCI_REQUIREMENTS[id]?.requiredFields ?? []))
      );

      const resolvedTimeRange =
        timeRange ??
        (() => {
          const ranges = requirementIds.map((id) => getAutonomousTimeRangeForCheck(id));
          const from = ranges.reduce(
            (earliest, r) => (r.from < earliest ? r.from : earliest),
            ranges[0].from
          );
          const to = ranges.reduce((latest, r) => (r.to > latest ? r.to : latest), ranges[0].to);
          return { from, to };
        })();

      const scopeClaim = buildAutonomousScopeClaim({
        indices: indexList,
        from: resolvedTimeRange.from,
        to: resolvedTimeRange.to,
        requirementsEvaluated: requirementIds,
        requiredFieldsChecked,
      });

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
          tool: 'pci_autonomous_scorecard_report',
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
    },
    tags: ['security', 'compliance', 'pci', 'audit', 'autonomous', 'report'],
  };
};
