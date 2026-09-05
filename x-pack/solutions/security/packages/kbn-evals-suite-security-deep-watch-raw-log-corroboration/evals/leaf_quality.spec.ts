/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L2 Leaf Quality — Raw Log Corroboration Worker
 *
 * Tests the threat-hunting skill's ability to corroborate an alert narrative
 * against raw telemetry (process, network, file events). Each scenario provides
 * a narrative built from alerts and expects the agent to query logs-* indices
 * to confirm or identify gaps.
 */

import { tags, selectEvaluators, getToolCallSteps, type Example } from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import { SCENARIOS } from '../src/dataset';
import { SKILL_ID, TOOL_IDS } from '../src/constants';
import { seedForensicTimeline } from '../src/data_generators/forensic_data';

interface RawLogEvalExample extends Example {
  input: {
    question: string;
  };
  output: {
    minCorroboratedCount: number;
    maxGapCount: number;
    minConfidence: number;
  };
  metadata?: {
    case_id: string;
    category: string;
  };
}

const toPrompt = (narrative: string, hosts: string[]): string =>
  `Corroborate the following alert narrative against raw telemetry.\n\n` +
  `Narrative: ${narrative}\n` +
  `Hosts in scope: ${hosts.join(', ')}\n\n` +
  `For each stage in the narrative, query logs-* indices to confirm or identify gaps. ` +
  `Report corroborated events, gap events, confidence, and unresolved questions.`;

const buildExamples = (): RawLogEvalExample[] =>
  SCENARIOS.map((scenario) => ({
    id: `raw-log-${scenario.id}`,
    input: {
      question: toPrompt(scenario.narrative, scenario.scope.hosts),
    },
    output: {
      minCorroboratedCount: scenario.expected.corroboratedCount,
      maxGapCount: scenario.expected.gapCount,
      minConfidence: scenario.expected.minConfidence,
    },
    metadata: {
      case_id: scenario.id,
      category: 'raw-log-corroboration',
    },
  }));

const examples = buildExamples();

base.describe('Raw Log Corroboration — L2 leaf quality', { tag: tags.stateful.classic }, () => {
  base.beforeAll(async ({ esClient, log }) => {
    const scenario = SCENARIOS[0];
    await seedForensicTimeline({
      esClient,
      scenarioId: scenario.id,
      hosts: scenario.scope.hosts,
      timeRange: scenario.scope.timeRange,
    });
  });

  base.afterAll(async ({ esClient }) => {
    // Cleanup handled by seeder
  });

  examples.forEach((example) => {
    base(
      example.id ?? `raw-log-${example.metadata?.case_id ?? 'unknown'}`,
      { tag: tags.stateful.classic },
      async ({ agentBuilderClient, esClient, evaluators, log }) => {
        const selected = selectEvaluators(Object.values(evaluators.traceBasedEvaluators));

        log.info(`[L2] Running ${example.id}`);

        const response = await agentBuilderClient.converse({
          agentId: 'elastic-ai-agent',
          input: example.input.question,
        });

        const toolCallSteps = getToolCallSteps(response);
        const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

        // Routing gates
        const skillInvoked = [...toolIds].some((id) => (id as string).includes(SKILL_ID));
        const searchToolCalled =
          toolIds.has(TOOL_IDS.SEARCH) ||
          [...toolIds].some(
            (id) =>
              (id as string).includes('generate_esql') || (id as string).includes('execute_esql')
          );

        // Corroboration quality
        const responseText = JSON.stringify(response);
        const corroboratedCount = (responseText.match(/corroborat/gi) || []).length;
        const gapCount = (responseText.match(/gap/gi) || []).length;

        // Groundedness
        const hasQueryReferences =
          responseText.includes('logs-') ||
          responseText.includes('ES|QL') ||
          responseText.includes('query');

        const success = skillInvoked && searchToolCalled && hasQueryReferences;

        return {
          success,
          explanation:
            `Skill invoked: ${skillInvoked}. ` +
            `Search tool called: ${searchToolCalled}. ` +
            `Corroborated: ${corroboratedCount}, Gaps: ${gapCount}. ` +
            `Grounded: ${hasQueryReferences}.`,
          scorecard: {
            skillInvoked: skillInvoked ? 1 : 0,
            correctToolCalled: searchToolCalled ? 1 : 0,
            corroborationDepth: corroboratedCount >= example.output.minCorroboratedCount ? 1 : 0,
            gapIdentification: gapCount <= example.output.maxGapCount + 1 ? 1 : 0,
            groundedness: hasQueryReferences ? 1 : 0,
          },
          metrics: selected.reduce((acc, ev) => {
            acc[ev.name] = 1;
            return acc;
          }, {} as Record<string, number>),
        };
      }
    );
  });
});
