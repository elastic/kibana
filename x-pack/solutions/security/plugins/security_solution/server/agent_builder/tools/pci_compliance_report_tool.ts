/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import {
  type ComplianceStatus,
  getDefaultTimeRange,
  getIndexPattern,
  normalizeRequirementId,
  PCI_REQUIREMENTS,
  resolveRequirementIds,
} from './pci_compliance_requirements';

const pciComplianceReportSchema = z.object({
  requirements: z
    .array(z.string())
    .optional()
    .describe('Optional list of requirements to include. Defaults to all 12.'),
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
    .describe('Optional ISO time range. Defaults to last 90 days.'),
  indices: z
    .array(z.string().min(1))
    .optional()
    .describe('Optional custom index patterns used for report generation.'),
  includeRecommendations: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include recommendation output in report sections.'),
});

export const PCI_COMPLIANCE_REPORT_TOOL_ID = securityTool('pci_compliance_report');

const calculateScore = (statuses: ComplianceStatus[]): number => {
  if (statuses.length === 0) {
    return 0;
  }

  const points = statuses.reduce((sum, status) => {
    if (status === 'GREEN') {
      return sum + 1;
    }
    if (status === 'AMBER') {
      return sum + 0.5;
    }
    return sum;
  }, 0);

  return Math.round((points / statuses.length) * 100);
};

const scoreToStatus = (score: number): ComplianceStatus => {
  if (score >= 85) {
    return 'GREEN';
  }
  if (score >= 60) {
    return 'AMBER';
  }
  return 'RED';
};

interface RequirementReportRow {
  id: string;
  name: string;
  status: ComplianceStatus;
  score: number;
  evidenceCount: number;
  topFindings: string[];
  recommendations: string[];
}

const evaluateRequirementForReport = async ({
  requirementId,
  indexPattern,
  from,
  to,
  esClient,
}: {
  requirementId: string;
  indexPattern: string;
  from: string;
  to: string;
  esClient: ElasticsearchClient;
}): Promise<RequirementReportRow> => {
  const definition = PCI_REQUIREMENTS[requirementId];
  const esql = definition.buildEsql(indexPattern, from, to);

  try {
    const response = await executeEsql({
      query: esql,
      esClient,
    });

    const count = Number(response.values?.[0]?.[0] ?? 0);
    const status: ComplianceStatus = count > 0 ? 'GREEN' : 'AMBER';

    return {
      id: definition.id,
      name: definition.name,
      status,
      score: status === 'GREEN' ? 100 : 60,
      evidenceCount: Number.isFinite(count) ? count : 0,
      topFindings: [
        count > 0
          ? `${count} matching events found for requirement ${definition.id}.`
          : `No telemetry evidence found for requirement ${definition.id}.`,
      ],
      recommendations: definition.recommendations,
    };
  } catch (error) {
    return {
      id: definition.id,
      name: definition.name,
      status: 'RED',
      score: 0,
      evidenceCount: 0,
      topFindings: [
        `Failed to evaluate requirement ${definition.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      ],
      recommendations: definition.recommendations,
    };
  }
};

export const pciComplianceReportTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciComplianceReportSchema> => {
  return {
    id: PCI_COMPLIANCE_REPORT_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Generate PCI DSS compliance reports with Red/Amber/Green status across all requirements or a selected subset.',
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
      const requested = resolveRequirementIds(requirements);
      const normalized = requested.map((requirementId) => normalizeRequirementId(requirementId));

      if (normalized.some((requirementId) => !requirementId)) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'One or more PCI requirement identifiers are invalid.',
              },
            },
          ],
        };
      }

      const requirementIds = [
        ...new Set(normalized.map((requirementId) => requirementId as string)),
      ];
      const { from, to } = timeRange ?? getDefaultTimeRange();
      const indexPattern = getIndexPattern(indices);

      const rows: RequirementReportRow[] = [];
      for (const requirementId of requirementIds) {
        rows.push(
          await evaluateRequirementForReport({
            requirementId,
            indexPattern,
            from,
            to,
            esClient: esClient.asCurrentUser,
          })
        );
      }

      const overallScore = calculateScore(rows.map((row) => row.status));
      const overallStatus = scoreToStatus(overallScore);
      const redCount = rows.filter((row) => row.status === 'RED').length;
      const amberCount = rows.filter((row) => row.status === 'AMBER').length;
      const greenCount = rows.filter((row) => row.status === 'GREEN').length;

      const requirementRows = rows.map((row) => ({
        ...row,
        recommendations: includeRecommendations ? row.recommendations : [],
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              format,
              generatedAt: new Date().toISOString(),
              timeRange: { from, to },
              overallScore,
              overallStatus,
              summary: `PCI posture is ${overallStatus} with score ${overallScore}. Requirements: ${greenCount} GREEN, ${amberCount} AMBER, ${redCount} RED.`,
              requirements:
                format === 'executive'
                  ? requirementRows.map(({ id, name, status, score, evidenceCount }) => ({
                      id,
                      name,
                      status,
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
              },
            },
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'reporting'],
  };
};
