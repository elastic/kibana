/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { SKILL_ID } from '../constants';

export const GENERATE_INSIGHT_TOOL_ID = `${SKILL_ID}.generate_insight`;

export function generateInsightTool(): BuiltinSkillBoundedTool {
  return {
    id: GENERATE_INSIGHT_TOOL_ID,
    type: ToolType.builtin,
    description: `Generate and store structured Detection Engine space health troubleshooting insights.

This tool MUST ALWAYS be called as the final step of the troubleshooting process.

Creates a structured insight persisting the results of the space-level health analysis,
including identified issues, severity assessments, key metrics, and remediation steps.

**When to use:**
- After analyzing the space health data and reaching conclusions
- After all investigation steps have been completed`,
    schema: generateInsightSchema,
    handler: async ({ summary, issues, metrics, data }, { logger }) => {
      try {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                insight: {
                  summary,
                  issues,
                  metrics,
                  issueCount: issues.length,
                  overallSeverity: issues.length > 0 ? issues[0].severity : ('info' as const),
                  generatedAt: new Date().toISOString(),
                },
                supportingData: data,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${GENERATE_INSIGHT_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error generating insight: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}

const generateInsightSchema = z.object({
  summary: z
    .string()
    .min(1)
    .describe(
      'A concise summary of the overall Detection Engine health state in the current space.'
    ),
  issues: z
    .array(
      z.object({
        title: z.string().describe('Short title describing the issue.'),
        severity: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .describe('Assessed severity of this issue.'),
        description: z.string().describe('Detailed description of the identified issue.'),
        affectedRuleTypes: z
          .array(z.string())
          .optional()
          .describe('Rule types affected by this issue, if applicable.'),
        remediation: z.string().describe('Actionable remediation steps for this issue.'),
      })
    )
    .describe('List of identified issues, ordered by severity (critical first).'),
  metrics: z
    .object({
      totalRules: z.number().describe('Total number of rules in the space.'),
      enabledRules: z.number().describe('Number of enabled rules.'),
      failedExecutions: z.number().describe('Number of failed executions in the interval.'),
      warningExecutions: z.number().describe('Number of warning executions in the interval.'),
      totalGaps: z.number().describe('Number of detected execution gaps.'),
      p95ExecutionDurationMs: z
        .number()
        .optional()
        .describe('95th percentile execution duration in milliseconds.'),
    })
    .describe('Key metrics extracted from the health data.'),
  data: z
    .array(z.object({}).catchall(z.unknown()))
    .min(1)
    .describe('Relevant raw health data supporting the findings.'),
});
