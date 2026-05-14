/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
} from '@kbn/evals';
import { createSkillInvocationEvaluator } from '@kbn/evals';
import type { MigrationSkillsChatClient } from './chat_client';

/**
 * The two automatic-migration skill ids registered by security_solution.
 * Pinned here so spec files cannot accidentally reference a stale name.
 */
export const AUTOMATIC_MIGRATION_CORRECTION_SKILL_NAME = 'automatic-migration-correction' as const;
export const AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME = 'automatic-migration-context' as const;
export type AutomaticMigrationSkillName =
  | typeof AUTOMATIC_MIGRATION_CORRECTION_SKILL_NAME
  | typeof AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME;

export interface MigrationSkillExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
  };
  metadata?: {
    /**
     * If true, the example is a DISTRACTOR — a query that should NOT activate
     * the named skill. The skill-invocation evaluator inverts its pass logic
     * for these. Per the eval-conventions in CLAUDE.md, every baseline suite
     * must include distractors to keep skill selection honest.
     */
    distractor?: boolean;
    /**
     * Optional golden tool sequence the agent is expected to roughly follow.
     * Reserved for the trajectory evaluator (next iteration); included here
     * as a placeholder so spec authors can start annotating now.
     */
    tool_sequence?: string[];
  };
}

export type EvaluateMigrationSkillsDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: MigrationSkillExample[];
  };
  skillName: AutomaticMigrationSkillName;
}) => Promise<void>;

/**
 * Baseline criteria injected into every correction-skill example. Encodes the
 * skill's contract (migration scope, structural confirmation, no bulk
 * operations) so individual examples only have to add scenario-specific
 * criteria.
 */
export const BASELINE_CORRECTION_CRITERIA = [
  'The response keeps the work scoped to one migration and one rule (does NOT iterate over many rules in a single turn).',
  'For any destructive write to a translated rule, the response surfaces the diff (before / after) BEFORE invoking the update tool — never silently rewrites fields the user did not name.',
  'For any destructive write, the response either pauses for explicit operator confirmation OR passes `confirm: true` only because the user has just approved the diff in the prior turn — never as a default.',
  'The response never claims to have installed or activated the rule — it only touches the migration draft and surfaces the "install via migration install flow" reminder when persistence succeeds.',
];

/**
 * Baseline criteria for every context-skill example. Encodes the skill's
 * contract (migration scope, "next translation run only" semantics, structural
 * confirmation for destructive ops).
 */
export const BASELINE_CONTEXT_CRITERIA = [
  'The response keeps the work scoped to one migration (does NOT propose to upload a resource "globally" across migrations).',
  'For any destructive resource write (replace / remove), the response surfaces what is changing BEFORE invoking the upsert / remove tool and gates the call on explicit operator confirmation.',
  'The response explicitly clarifies that new context applies on the NEXT translation run, not retroactively to already-translated rules.',
  'The response never proposes a bulk import of many resources in one turn — that path is out of scope for the chat skill.',
];

const baselineForSkill = (skillName: AutomaticMigrationSkillName): string[] => {
  switch (skillName) {
    case AUTOMATIC_MIGRATION_CORRECTION_SKILL_NAME:
      return BASELINE_CORRECTION_CRITERIA;
    case AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME:
      return BASELINE_CONTEXT_CRITERIA;
    default: {
      const _exhaustive: never = skillName;
      return _exhaustive;
    }
  }
};

/**
 * Composes the per-example criteria list with the skill's baseline contract.
 * Distractor examples are evaluated against a single criterion: that the
 * model produced a clean refusal / hand-off (since for distractors the
 * baseline behaviour-claims do not apply).
 */
export function createMigrationSkillCriteriaEvaluator({
  evaluators,
  skillName,
}: {
  evaluators: DefaultEvaluators;
  skillName: AutomaticMigrationSkillName;
}): Evaluator {
  const baseline = baselineForSkill(skillName);

  return {
    name: `${skillName} criteria`,
    kind: 'LLM' as const,
    evaluate: async ({ expected, metadata, ...rest }) => {
      const isDistractor = (metadata as MigrationSkillExample['metadata'])?.distractor === true;
      const exampleCriteria: string[] =
        (expected as MigrationSkillExample['output'])?.criteria ?? [];

      const allCriteria = isDistractor
        ? [
            "The response declines to invoke the named skill's tools and either hands off to a more appropriate skill or asks a clarifying question.",
            ...exampleCriteria,
          ]
        : [...baseline, ...exampleCriteria];

      return evaluators.criteria(allCriteria).evaluate({ expected, metadata, ...rest });
    },
  };
}

export function createEvaluateMigrationSkillsDataset({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: MigrationSkillsChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateMigrationSkillsDataset {
  return async function evaluateMigrationSkillsDataset({
    dataset: { name, description, examples },
    skillName,
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await executorClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => {
          const response = await chatClient.converse({ message: input.question });
          return {
            messages: response.messages,
            steps: response.steps,
            errors: response.errors,
            traceId: response.traceId,
          };
        },
      },
      [
        createMigrationSkillCriteriaEvaluator({ evaluators, skillName }),
        createSkillInvocationEvaluator({
          traceEsClient,
          log,
          skillName,
        }),
      ]
    );
  };
}
