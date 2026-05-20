/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-architected PCI DSS scorecard report tool.
 *
 * Sibling of `pci_autonomous_compliance_check`. This tool returns an executive roll-up
 * across all 12 requirements (numeric score plus status counts); the check tool returns
 * per-requirement findings with ES|QL evidence. Both share the underlying evaluator
 * orchestration via {@link runAutonomousPciEvaluationPack} so the two surfaces stay
 * aligned and report the same severity-based posture.
 *
 * Imports only from the autonomously-authored engine modules
 * (`pci_autonomous_requirements`, `pci_autonomous_evaluator`,
 * `pci_autonomous_schemas`). Zero imports from the hand-written sibling's
 * `pci_compliance_*` modules.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { securityTool } from '../constants';
import {
  getAutonomousIndexList,
  getAutonomousIndexPattern,
  resolveAutonomousRequirementIds,
} from './pci_autonomous_requirements';
import {
  pciAutonomousIndexPatternSchema,
  pciAutonomousTimeRangeSchema,
  buildAutonomousScopeClaim,
} from './pci_autonomous_schemas';
import {
  rollupAutonomousConfidence,
  rollupAutonomousOverallStatus,
  runAutonomousPciEvaluationPack,
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
      'executive posture snapshot — then drill down with the sibling ' +
      'pci_autonomous_compliance_check tool on any RED/AMBER rows that need ES|QL evidence.',
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

      const { rows, requiredFieldsChecked, resolvedTimeRange } =
        await runAutonomousPciEvaluationPack({
          requirementIds,
          indexPattern,
          timeRange,
          includeEvidence: false,
          esClient: esClient.asCurrentUser,
        });

      const scopeClaim = buildAutonomousScopeClaim({
        indices: indexList,
        from: resolvedTimeRange.from,
        to: resolvedTimeRange.to,
        requirementsEvaluated: requirementIds,
        requiredFieldsChecked,
      });

      // `overallScore` is the numeric metric for executive display (0-100,
      // averaged across rows). `overallStatus` is derived from STATUS COUNTS
      // — the same severity-based rollup the compliance-check tool uses — so
      // the two tools cannot disagree on posture for the same input data.
      // Prior versions derived `overallStatus` from `scoreToStatus(overallScore)`,
      // which could yield GREEN even when one requirement was RED.
      const overallScore =
        rows.length === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length);
      const overallStatus = rollupAutonomousOverallStatus(rows);
      const overallConfidence = rollupAutonomousConfidence(rows);

      const greenCount = rows.filter((r) => r.status === 'GREEN').length;
      const amberCount = rows.filter((r) => r.status === 'AMBER').length;
      const redCount = rows.filter((r) => r.status === 'RED').length;
      const notAssessableCount = rows.filter((r) => r.status === 'NOT_ASSESSABLE').length;

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

      // The scorecard table is a synthesised executive summary — it is NOT
      // the output of an ES|QL `ROW` query against the cluster. Earlier
      // versions wrapped this payload in `ToolResultType.esqlResults`, which
      // misled downstream UX/telemetry that special-cases that result type.
      // Return it under `ToolResultType.other` and let consumers render it
      // as a tabular summary.
      const scorecardTable = {
        columns: [
          { name: 'Requirement', type: 'keyword' },
          { name: 'Check', type: 'keyword' },
          { name: 'Status', type: 'keyword' },
          { name: 'Confidence', type: 'keyword' },
          { name: 'Score', type: 'long' },
          { name: 'Findings', type: 'long' },
        ],
        values: rows.map((r) => [
          r.requirement,
          r.name,
          r.status,
          r.confidence,
          r.score,
          r.evidenceCount,
        ]),
      };

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              tool: 'pci_autonomous_scorecard_report',
              format,
              generatedAt: new Date().toISOString(),
              overallScore,
              overallStatus,
              overallConfidence,
              summary: `PCI DSS v4.0.1 posture is ${overallStatus} with score ${overallScore}/100. Requirements: ${greenCount} GREEN, ${amberCount} AMBER, ${redCount} RED, ${notAssessableCount} NOT ASSESSABLE.`,
              scorecardTable,
              requirements:
                format === 'executive'
                  ? requirementRows.map(
                      ({ id, name, status, confidence, score, evidenceCount }) => ({
                        id,
                        name,
                        status,
                        confidence,
                        score,
                        evidenceCount,
                      })
                    )
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
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'audit', 'autonomous', 'report'],
  };
};
