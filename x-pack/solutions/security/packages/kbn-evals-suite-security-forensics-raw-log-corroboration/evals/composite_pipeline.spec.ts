/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L3 Composite Pipeline — Raw Log Corroboration Worker
 *
 * Tests the full multi-tool orchestration:
 *   1. Agent receives alert narrative + host scope
 *   2. Agent queries logs-endpoint.events.* via ES|QL for process/network/file events
 *   3. Agent correlates findings with narrative stages
 *   4. Agent produces structured corroboration report (corroborated + gaps + confidence)
 *
 * Verifies the complete pipeline from narrative input to structured output,
 * including pivot logic (finding a suspicious process triggers additional checks).
 */

import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import { SCENARIOS } from '../src/dataset';
import { logScorecard } from '../src/scorecard_log';
import { SKILL_ID, TOOL_IDS } from '../src/constants';
import { seedForensicTimeline, cleanupSeededData } from '../src/data_generators/forensic_data';

evaluate.describe(
  'C3:L3 | Raw Log Corroboration — Composite pipeline',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      for (const scenario of SCENARIOS) {
        await seedForensicTimeline({ esClient, scenario });
      }
    });

    evaluate.afterAll(async ({ esClient }) => {
      // Seeder only bulk-indexes; all scenarios share the same `logs-*` indices.
      for (const scenario of SCENARIOS) {
        await cleanupSeededData(esClient, scenario.id);
      }
    });

    const scenario = SCENARIOS.find((s) => s.id === 'full-corroboration') ?? SCENARIOS[0];

    evaluate(
      'should execute full pipeline: discovery → esql → corroboration',
      { tag: tags.stateful.classic },
      async ({ agentBuilderClient, esClient, evaluators, log }) => {
        const prompt =
          `Corroborate the following alert narrative against raw telemetry.\n\n` +
          `Narrative: ${scenario.narrative}\n` +
          `Hosts: ${scenario.scope.hosts.join(', ')}\n` +
          `Time range: ${scenario.scope.timeRange.from} to ${scenario.scope.timeRange.to}\n\n` +
          `Query logs-endpoint.events.* indices. For each narrative stage, confirm or identify gaps. ` +
          `If a suspicious process is found, pivot to check persistence and lateral movement indicators.`;

        log.info('[L3] Starting composite pipeline test');

        const response = await agentBuilderClient.converse({
          agentId: 'elastic-ai-agent',
          input: prompt,
          // Pin the skill under test. This suite scores the raw-log corroboration
          // worker's pipeline, not the agent's ability to route to it: without
          // the override any path that makes two ES|QL calls and echoes the
          // prompt vocabulary could satisfy the pipeline gates while never
          // invoking the worker. Matches the runtime override the worker is
          // launched with (see the sibling Watch suites' configurationOverrides).
          configurationOverrides: { skillIds: [SKILL_ID] },
        });

        const toolCallSteps = getToolCallSteps(response);
        const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

        // Pipeline gates: verify multi-tool orchestration
        const hasDiscovery = [...toolIds].some(
          (id) =>
            (id as string).includes('list_indices') || (id as string).includes('get_index_mapping')
        );
        const hasEsql = [...toolIds].some(
          (id) =>
            (id as string).includes('generate_esql') || (id as string).includes('execute_esql')
        );
        const hasSearch = toolIds.has(TOOL_IDS.SEARCH);
        const hasSkillInvoke = [...toolIds].some((id) => (id as string).includes(SKILL_ID));

        // Multi-step: at least 2 tool calls (discovery + query)
        const minToolCalls = 2;
        const multiStep = toolCallSteps.length >= minToolCalls;

        // Structured output
        const responseText = JSON.stringify(response);
        const hasCorroborated = responseText.toLowerCase().includes('corroborat');
        const hasGaps = responseText.toLowerCase().includes('gap');
        const hasConfidence = responseText.toLowerCase().includes('confidence');

        // Pivot logic
        const hasProcessQuery =
          responseText.includes('process') || responseText.includes('logs-endpoint.events.process');
        const hasPersistenceCheck =
          responseText.includes('persistence') ||
          responseText.includes('registry') ||
          responseText.includes('scheduled');
        const hasLateralCheck =
          responseText.includes('lateral') || responseText.includes('network');

        const structuredOutput = hasCorroborated && hasGaps && hasConfidence;
        const pivotLogic = hasProcessQuery && (hasPersistenceCheck || hasLateralCheck);

        // `hasSkillInvoke` is a GATE, not a diagnostic. It was computed and then
        // omitted from `success`, so the named-worker suite could go green
        // without the worker under test ever being invoked.
        const success = hasEsql && multiStep && structuredOutput && pivotLogic && hasSkillInvoke;

        log.info(
          `[L3] tools=${toolIds.size}, esql=${hasEsql}, multiStep=${multiStep}, ` +
            `structured=${structuredOutput}, pivot=${pivotLogic}, skill=${hasSkillInvoke}`
        );

        const scorecard = {
          pipelineDiscovery: hasDiscovery ? 1 : 0,
          pipelineEsql: hasEsql ? 1 : 0,
          pipelineSearch: hasSearch ? 1 : 0,
          pipelineSkillInvoked: hasSkillInvoke ? 1 : 0,
          pipelineMultiStep: multiStep ? 1 : 0,
          pipelineStructuredOutput: structuredOutput ? 1 : 0,
          pipelinePivotLogic: pivotLogic ? 1 : 0,
        };

        logScorecard(log, { level: 'L3', exampleId: scenario.id, scorecard });

        return {
          success,
          explanation:
            `Esql: ${hasEsql}. MultiStep: ${multiStep} (${toolCallSteps.length} calls). ` +
            `Structured: ${structuredOutput}. Pivot: ${pivotLogic}. ` +
            `Discovery: ${hasDiscovery}, Search: ${hasSearch}, Skill: ${hasSkillInvoke} (required).`,
          scorecard,
        };
      }
    );
  }
);
