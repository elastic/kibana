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
  PCI_REQUIREMENTS,
  resolveRequirementIds,
} from './pci_compliance_requirements';

const pciComplianceReportSchema = z.object({
  requirements: z
    .array(z.string())
    .optional()
    .describe('Optional list of requirements to include. Defaults to all.'),
  format: z
    .enum(['summary', 'detailed', 'executive'])
    .optional()
    .default('summary')
    .describe('Report level: summary, detailed, or executive.'),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional()
    .describe(
      'Optional ISO time range. If omitted, each check uses its recommended lookback period.'
    ),
  indices: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Specify exact index patterns to avoid duplicate counts. Use specific patterns during re-indexing.'
    ),
  includeRecommendations: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include recommendation output in report sections.'),
});

export const PCI_COMPLIANCE_REPORT_TOOL_ID = securityTool('pci_compliance_report');

const CONCURRENCY_LIMIT = 4;

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result);
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

interface RequirementReportRow {
  id: string;
  name: string;
  pciReference: string;
  status: ComplianceStatus;
  confidence: ComplianceConfidence;
  score: number;
  evidenceCount: number;
  topFindings: string[];
  recommendations: string[];
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

async function evaluateRequirementForReport({
  definition,
  indexPattern,
  from,
  to,
  esClient,
}: {
  definition: PciRequirementDefinition;
  indexPattern: string;
  from: string;
  to: string;
  esClient: ElasticsearchClient;
}): Promise<RequirementReportRow> {
  let status: ComplianceStatus = 'AMBER';
  let confidence: ComplianceConfidence = 'LOW';
  let evidenceCount = 0;
  const topFindings: string[] = [];

  // Run violation query if available
  if (definition.buildViolationEsql) {
    try {
      const violationResult = await executeEsql({
        query: definition.buildViolationEsql(indexPattern, from, to),
        esClient,
      });
      const rowCount = violationResult.values?.length ?? 0;

      if (definition.verdict === 'rows_mean_violation' && rowCount > 0) {
        status = 'RED';
        confidence = 'HIGH';
        evidenceCount = rowCount;
        topFindings.push(`${rowCount} violation(s) detected for ${definition.name}.`);
        return buildRow(definition, status, confidence, evidenceCount, topFindings);
      }

      if (definition.verdict === 'rows_mean_evidence' && rowCount > 0) {
        status = 'GREEN';
        confidence = 'HIGH';
        evidenceCount = rowCount;
        topFindings.push(`${rowCount} evidence record(s) found for ${definition.name}.`);
        return buildRow(definition, status, confidence, evidenceCount, topFindings);
      }
    } catch (error) {
      topFindings.push(
        `Violation query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Run coverage query
  try {
    const coverageResult = await executeEsql({
      query: definition.buildCoverageEsql(indexPattern, from, to),
      esClient,
    });
    const count = toNumber(coverageResult.values?.[0]?.[0]);

    if (count > 0) {
      status = definition.verdict === 'rows_mean_violation' ? 'GREEN' : 'GREEN';
      confidence = definition.buildViolationEsql ? 'HIGH' : 'MEDIUM';
      evidenceCount = count;
      topFindings.push(`${count} matching events found for ${definition.name}.`);
    } else {
      topFindings.push(`No telemetry evidence found for ${definition.name}.`);
    }
  } catch (error) {
    status = 'AMBER';
    confidence = 'NOT_ASSESSABLE';
    topFindings.push(
      `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return buildRow(definition, status, confidence, evidenceCount, topFindings);
}

function buildRow(
  definition: PciRequirementDefinition,
  status: ComplianceStatus,
  confidence: ComplianceConfidence,
  evidenceCount: number,
  topFindings: string[]
): RequirementReportRow {
  return {
    id: definition.id,
    name: definition.name,
    pciReference: definition.pciReference,
    status,
    confidence,
    score: statusToScore(status, confidence),
    evidenceCount,
    topFindings,
    recommendations: definition.recommendations,
  };
}

function statusToScore(status: ComplianceStatus, confidence: ComplianceConfidence): number {
  const baseScore =
    status === 'GREEN' ? 100 : status === 'AMBER' ? 50 : status === 'RED' ? 0 : 25;

  const confidenceWeight =
    confidence === 'HIGH'
      ? 1.0
      : confidence === 'MEDIUM'
      ? 0.8
      : confidence === 'LOW'
      ? 0.5
      : 0.3;

  return Math.round(baseScore * confidenceWeight);
}

const calculateOverallScore = (rows: RequirementReportRow[]): number => {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => sum + row.score, 0);
  return Math.round(total / rows.length);
};

const scoreToStatus = (score: number): ComplianceStatus => {
  if (score >= 85) return 'GREEN';
  if (score >= 60) return 'AMBER';
  return 'RED';
};

export const pciComplianceReportTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciComplianceReportSchema> => {
  return {
    id: PCI_COMPLIANCE_REPORT_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Generate PCI DSS v4.0.1 compliance reports with Red/Amber/Green status, confidence scoring, ' +
      'and visual scorecards across all requirements or a selected subset.',
    schema: pciComplianceReportSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { requirements, format = 'summary', timeRange, indices, includeRecommendations = true },
      { esClient }
    ) => {
      if (requirements?.length) {
        for (const raw of requirements) {
          if (!normalizeRequirementId(raw)) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'One or more PCI requirement identifiers are invalid.' },
                },
              ],
            };
          }
        }
      }

      const requested = resolveRequirementIds(requirements);
      const normalized = requested.map((reqId) => normalizeRequirementId(reqId));

      if (normalized.some((reqId) => !reqId)) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'One or more PCI requirement identifiers are invalid.' },
            },
          ],
        };
      }

      const requirementIds = [...new Set(normalized.map((reqId) => reqId as string))];
      const indexPattern = getIndexPattern(indices);

      const tasks = requirementIds.map((reqId) => async () => {
        const definition = PCI_REQUIREMENTS[reqId];
        const { from, to } = getTimeRangeForCheck(reqId, timeRange);
        return evaluateRequirementForReport({
          definition,
          indexPattern,
          from,
          to,
          esClient: esClient.asCurrentUser,
        });
      });

      const rows = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

      const overallScore = calculateOverallScore(rows);
      const overallStatus = scoreToStatus(overallScore);
      const redCount = rows.filter((r) => r.status === 'RED').length;
      const amberCount = rows.filter((r) => r.status === 'AMBER').length;
      const greenCount = rows.filter((r) => r.status === 'GREEN').length;
      const notAssessableCount = rows.filter((r) => r.status === 'NOT_ASSESSABLE').length;

      const highConfCount = rows.filter((r) => r.confidence === 'HIGH').length;
      const overallConfidence: ComplianceConfidence =
        highConfCount >= rows.length / 2 ? 'HIGH' : 'MEDIUM';

      const requirementRows = rows.map((row) => ({
        ...row,
        recommendations: includeRecommendations ? row.recommendations : [],
      }));

      const results: Array<{
        type: ToolResultType;
        data: Record<string, unknown>;
        tool_result_id?: string;
      }> = [];

      // Visual scorecard table
      const scorecardColumns = [
        { name: 'Requirement', type: 'keyword' },
        { name: 'Check', type: 'keyword' },
        { name: 'Status', type: 'keyword' },
        { name: 'Confidence', type: 'keyword' },
        { name: 'Score', type: 'long' },
        { name: 'Findings', type: 'long' },
      ];
      const scorecardValues = rows.map((r) => [
        r.id,
        r.name,
        r.status,
        r.confidence,
        r.score,
        r.evidenceCount,
      ]);

      results.push({
        type: ToolResultType.query,
        data: { esql: 'PCI DSS v4.0.1 Compliance Report' },
      });
      results.push({
        tool_result_id: getToolResultId(),
        type: ToolResultType.esqlResults,
        data: {
          query: 'PCI DSS v4.0.1 Compliance Scorecard',
          columns: scorecardColumns,
          values: scorecardValues,
        },
      });

      results.push({
        type: ToolResultType.other,
        data: {
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
        },
      });

      return { results };
    },
    tags: ['security', 'compliance', 'pci', 'reporting'],
  };
};
