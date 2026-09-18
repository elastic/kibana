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

import { tags, getToolCallSteps, type Example } from '@kbn/evals';
import { getNarrativeText, countDistinctClaims } from '../src/narrative_claims';
import { logScorecard } from '../src/scorecard_log';
import { selectShard } from '../src/select_shard';
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
    maxCorroboratedCount: number;
    minGapCount: number;
    maxGapCount: number;
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
      minCorroboratedCount: scenario.expected.minCorroboratedCount,
      maxCorroboratedCount: scenario.expected.maxCorroboratedCount,
      minGapCount: scenario.expected.minGapCount,
      maxGapCount: scenario.expected.maxGapCount,
    },
    metadata: {
      case_id: scenario.id,
      category: 'raw-log-corroboration',
    },
  }));

// Sharded sweeps run one stride slice per stack; unset means the full dataset.
const examples = selectShard(buildExamples(), process.env.EVAL_SHARD);

base.describe('Raw Log Corroboration — L2 leaf quality', { tag: tags.stateful.classic }, () => {
  base.beforeAll(async ({ esClient, log }) => {
    // Seed every scenario from its own `stages`. Only SCENARIOS[0] used to be
    // seeded, so the remaining scenarios ran against telemetry that contradicted
    // their premise — the "no raw telemetry" scenario's host had seeded events.
    for (const scenario of SCENARIOS) {
      await seedForensicTimeline({ esClient, scenario });
      const inScope = scenario.stages.filter((s) => s.corroborated).length;
      const decoys = scenario.stages.filter((s) => s.decoy !== undefined).length;
      log.info(
        `[L2] Seeded ${scenario.id}: ${inScope} in-scope stage(s), ${decoys} decoy stage(s)`
      );
    }
  });

  base.afterAll(async ({ esClient }) => {
    // Cleanup handled by seeder
  });

  examples.forEach((example) => {
    base(
      example.id ?? `raw-log-${example.metadata?.case_id ?? 'unknown'}`,
      { tag: tags.stateful.classic },
      async ({ agentBuilderClient, esClient, log }) => {
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

        // Corroboration quality. Count narrative claims in the model's own
        // message text only — NOT over the full response envelope, whose tool
        // outputs (ES|QL result payloads) can contain hundreds of incidental
        // substring matches and inflate the count. Gap claims are deduplicated
        // case-insensitively so repeated headings/boilerplate don't count as
        // distinct identified gaps.
        const narrativeText = getNarrativeText(response);
        const corroboratedCount = countDistinctClaims(narrativeText, /corroborat\w*/gi);
        const gapCount = countDistinctClaims(narrativeText, /gap\w*/gi);

        // Groundedness
        const hasQueryReferences =
          narrativeText.includes('logs-') ||
          narrativeText.includes('ES|QL') ||
          narrativeText.includes('query') ||
          // Tool inputs are still valid grounding evidence even when the final
          // narrative summarizes without naming indices.
          [...toolIds].some(
            (id) =>
              (id as string).includes('generate_esql') || (id as string).includes('execute_esql')
          );

        // Two-sided bounds from the dataset. The previous shape bounded
        // corroboration only from below and gaps only loosely from above
        // (`maxGapCount + 1`), so claiming corroboration the telemetry cannot
        // support was never penalised and every scenario passed on vocabulary
        // alone. Bounds are exact now: the dataset states what the seeded
        // telemetry can and cannot support.
        const corroborationDepth = corroboratedCount >= example.output.minCorroboratedCount;
        const corroborationPrecision = corroboratedCount <= example.output.maxCorroboratedCount;
        const gapDetection = gapCount >= example.output.minGapCount;
        const gapRestraint = gapCount <= example.output.maxGapCount;

        // `success` is the AND of every dimension the scorecard reports, so a
        // reported 0 can never coexist with a green result.
        const success =
          skillInvoked &&
          searchToolCalled &&
          corroborationDepth &&
          corroborationPrecision &&
          gapDetection &&
          gapRestraint &&
          hasQueryReferences;

        const scorecard = {
          skillInvoked: skillInvoked ? 1 : 0,
          correctToolCalled: searchToolCalled ? 1 : 0,
          corroborationDepth: corroborationDepth ? 1 : 0,
          corroborationPrecision: corroborationPrecision ? 1 : 0,
          gapDetection: gapDetection ? 1 : 0,
          gapRestraint: gapRestraint ? 1 : 0,
          groundedness: hasQueryReferences ? 1 : 0,
        };

        logScorecard(log, {
          level: 'L2',
          exampleId: example.id ?? example.metadata?.case_id ?? 'unknown',
          scorecard,
        });

        return {
          success,
          explanation:
            `Skill invoked: ${skillInvoked}. ` +
            `Search tool called: ${searchToolCalled}. ` +
            `Corroborated: ${corroboratedCount} (expected ${example.output.minCorroboratedCount}-${example.output.maxCorroboratedCount}). ` +
            `Gaps: ${gapCount} (expected ${example.output.minGapCount}-${example.output.maxGapCount}). ` +
            `Grounded: ${hasQueryReferences}.`,
          scorecard,
        };
      }
    );
  });
});
