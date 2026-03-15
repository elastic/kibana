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
} from './pci_compliance_requirements';

const pciComplianceCheckSchema = z.object({
  requirement: z
    .string()
    .describe(
      'PCI DSS requirement identifier. Use "all", major requirements like "8", or sub-requirements like "8.3".'
    ),
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
    .describe('Optional index patterns for custom ingestion environments.'),
  includeEvidence: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include summarized ES|QL output in findings for audit evidence.'),
});

export const PCI_COMPLIANCE_CHECK_TOOL_ID = securityTool('pci_compliance_check');

interface RequirementCheckResult {
  requirement: string;
  name: string;
  status: ComplianceStatus;
  summary: string;
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

const evaluateRequirement = async ({
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
}): Promise<RequirementCheckResult> => {
  const definition = PCI_REQUIREMENTS[requirementId];
  const esql = definition.buildEsql(indexPattern, from, to);

  try {
    const response = await executeEsql({
      query: esql,
      esClient,
    });

    const count = toNumber(response.values?.[0]?.[0]);
    const status: ComplianceStatus = count > 0 ? 'GREEN' : 'AMBER';
    const findings = [
      {
        check: `${definition.id} telemetry coverage check`,
        status,
        detail:
          count > 0
            ? `Observed ${count} matching events for this requirement in the selected time window.`
            : 'No matching telemetry found for this requirement in the selected time window.',
        ...(includeEvidence
          ? {
              evidence: {
                query: esql,
                columns: response.columns,
                values: response.values.slice(0, 10),
              },
            }
          : {}),
      },
    ];

    return {
      requirement: definition.id,
      name: definition.name,
      status,
      summary:
        status === 'GREEN'
          ? `Requirement ${definition.id} has evidence in current telemetry.`
          : `Requirement ${definition.id} has partial coverage and requires additional validation.`,
      findings,
      recommendations: definition.recommendations,
      dataGaps: status === 'GREEN' ? [] : definition.requiredFields,
    };
  } catch (error) {
    return {
      requirement: definition.id,
      name: definition.name,
      status: 'RED',
      summary: `Requirement ${definition.id} check failed due to query or mapping issues.`,
      findings: [
        {
          check: `${definition.id} telemetry coverage check`,
          status: 'RED',
          detail: `Unable to evaluate requirement due to query failure: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          ...(includeEvidence ? { evidence: { query: esql, columns: [], values: [] } } : {}),
        },
      ],
      recommendations: definition.recommendations,
      dataGaps: definition.requiredFields,
    };
  }
};

export const pciComplianceCheckTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciComplianceCheckSchema> => {
  return {
    id: PCI_COMPLIANCE_CHECK_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Run PCI DSS compliance checks for one requirement, a sub-requirement, or all requirements with ECS-first ES|QL evaluation and data-gap reporting.',
    schema: pciComplianceCheckSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ requirement, timeRange, indices, includeEvidence = false }, { esClient }) => {
      const normalized = normalizeRequirementId(requirement);
      if (!normalized) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Unsupported PCI requirement "${requirement}". Use "all", "1".."12", or sub-requirements like "8.3".`,
              },
            },
          ],
        };
      }

      const { from, to } = timeRange ?? getDefaultTimeRange();
      const indexPattern = getIndexPattern(indices);
      const requirementIds =
        normalized === 'all' ? Object.keys(PCI_REQUIREMENTS) : [normalized.split('.')[0]];

      const requirementResults: RequirementCheckResult[] = [];
      for (const requirementId of requirementIds) {
        const result = await evaluateRequirement({
          requirementId,
          indexPattern,
          from,
          to,
          includeEvidence,
          esClient: esClient.asCurrentUser,
        });
        requirementResults.push(result);
      }

      const statusCounts = requirementResults.reduce(
        (acc, result) => {
          acc[result.status] += 1;
          return acc;
        },
        { RED: 0, AMBER: 0, GREEN: 0, NOT_APPLICABLE: 0 }
      );

      const overallStatus: ComplianceStatus =
        statusCounts.RED > 0 ? 'RED' : statusCounts.AMBER > 0 ? 'AMBER' : 'GREEN';

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              request: {
                requirement,
                from,
                to,
                indices: indices ?? [...indexPattern.split(',')],
              },
              overallStatus,
              statusCounts,
              requirementResults,
            },
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'audit'],
  };
};
