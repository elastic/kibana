/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-architected PCI DSS compliance check tool.
 *
 * Per the cycle-17 architect's blueprint, the autonomous variant splits the consolidated
 * `pci_compliance` tool into two specialised tools: this one (check mode only) and the
 * sibling `pci_autonomous_scorecard_report` tool. The argument was that two narrow tools
 * are easier for the LLM to route between than a single tool with a `mode` parameter that
 * branches behaviour.
 *
 * INDEPENDENCE CLAIM (see comparison.html §1.5): this tool now imports only from the
 * autonomously-authored engine modules (`pci_autonomous_requirements`,
 * `pci_autonomous_evaluator`, `pci_autonomous_schemas`). It has ZERO imports from the
 * hand-written sibling's `pci_compliance_*` modules. The CI test
 * `pci_autonomous_modules_no_handwritten_imports.test.ts` locks this in.
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
  normalizeAutonomousRequirementId,
  resolveAutonomousRequirementIds,
} from './pci_autonomous_requirements';
import {
  pciAutonomousIndexPatternSchema,
  pciAutonomousRequirementIdSchema,
  pciAutonomousTimeRangeSchema,
  buildAutonomousScopeClaim,
} from './pci_autonomous_schemas';
import {
  type AutonomousEvaluatedRequirement,
  evaluateAutonomousRequirement,
  runAutonomousWithConcurrency,
  AUTONOMOUS_PCI_REQUIREMENT_CONCURRENCY,
} from './pci_autonomous_evaluator';

const pciAutonomousComplianceCheckSchema = z
  .object({
    requirements: z
      .array(pciAutonomousRequirementIdSchema)
      .min(1)
      .optional()
      .describe(
        'Requirement identifiers to check. Accepts "all", top-level ("1".."12"), or sub-requirements ' +
          'like "8.3.4". Defaults to ["all"].'
      ),
    timeRange: pciAutonomousTimeRangeSchema
      .optional()
      .describe(
        'Optional ISO-8601 time range (`from` <= `to`). If omitted, each requirement uses its ' +
          'recommended lookback window (e.g. 7 days for brute-force, 365 days for stale accounts).'
      ),
    indices: z
      .array(pciAutonomousIndexPatternSchema)
      .min(1)
      .optional()
      .describe(
        'Index patterns to query. Specify exact patterns to avoid overlap / double-counting during ' +
          're-indexing. Defaults to logs-*, endgame-*, winlogbeat-*.'
      ),
    includeEvidence: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include tabular ES|QL evidence rows in each finding.'),
  })
  .describe(
    'Run a PCI DSS v4.0.1 compliance CHECK for one or more requirements and return per-requirement ' +
      'findings with evidence. For posture roll-ups across all requirements use the sibling ' +
      'pci_autonomous_scorecard_report tool instead.'
  );

export const PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID = securityTool(
  'pci_autonomous_compliance_check'
);

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

const rollupOverallStatus = (rows: AutonomousEvaluatedRequirement[]): AutonomousComplianceStatus => {
  const counts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  if ((counts.RED ?? 0) > 0) return 'RED';
  if ((counts.AMBER ?? 0) > 0 || (counts.NOT_ASSESSABLE ?? 0) > 0) return 'AMBER';
  return 'GREEN';
};

export const pciAutonomousComplianceCheckTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciAutonomousComplianceCheckSchema> => {
  return {
    id: PCI_AUTONOMOUS_COMPLIANCE_CHECK_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Autonomous-variant PCI DSS v4.0.1 compliance CHECK. Runs requirement-specific violation, ' +
      'coverage, and preflight evaluations and returns per-requirement findings with ES|QL ' +
      'evidence and a scopeClaim provenance payload. Use this for actionable findings on one or ' +
      'more requirements. For an executive posture roll-up across the full standard, use the ' +
      'sibling pci_autonomous_scorecard_report tool — the autonomous architect split these into ' +
      'two specialised tools rather than one mode-parameterised tool.',
    schema: pciAutonomousComplianceCheckSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ requirements, timeRange, indices, includeEvidence = true }, { esClient }) => {
      const requestedRaw = requirements && requirements.length > 0 ? requirements : ['all'];

      const normalizedRaw = requestedRaw.map((req) => normalizeAutonomousRequirementId(req));
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
      const requirementIds = resolveAutonomousRequirementIds(
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

      const indexList = getAutonomousIndexList(indices);
      const indexPattern = getAutonomousIndexPattern(indices);

      const tasks = requirementIds.map((reqId) => async () => {
        const { from, to } = getAutonomousTimeRangeForCheck(reqId, timeRange);
        return evaluateAutonomousRequirement({
          requirementId: reqId,
          indexPattern,
          from,
          to,
          includeEvidence,
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
            const { from, to } = getAutonomousTimeRangeForCheck(row.requirement, timeRange);
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
          tool: 'pci_autonomous_compliance_check',
          request: { requirements: requestedRaw, indices: indexList, indexPattern },
          overallStatus,
          overallConfidence,
          statusCounts,
          requirementResults: rows,
          scopeClaim,
        },
      });

      return { results };
    },
    tags: ['security', 'compliance', 'pci', 'audit', 'autonomous'],
  };
};
