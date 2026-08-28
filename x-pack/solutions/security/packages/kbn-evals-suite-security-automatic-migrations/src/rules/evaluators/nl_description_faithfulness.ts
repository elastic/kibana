/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleInput, RuleVendor } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

/**
 * NL-interpretation vendors (`vendorNeedsInterpretation` in `agent/graph.ts`).
 * Splunk skips that branch and has no NL description to grade.
 */
const NL_INTERPRETATION_VENDORS: Record<
  Exclude<RuleVendor, 'splunk'>,
  { sourceLabel: string; dependencyCriterion: string }
> = {
  qradar: {
    sourceLabel: 'QRadar XML rule definition',
    dependencyCriterion:
      'References all dependencies (building blocks, sub-rules) that were fetched and expanded, and resolves reference sets to lookup index names or explicitly marks them as unresolved',
  },
  'microsoft-sentinel': {
    sourceLabel: 'Microsoft Sentinel KQL rule definition',
    dependencyCriterion:
      'References all dependencies (watchlists, saved functions, cross-workspace or cross-table joins) that the query relies on, and either resolves them to lookup index names or explicitly marks them as unresolved',
  },
};

/**
 * Checks whether the NL description (nl_query) faithfully captures all detection logic from the
 * source rule, for the vendors that go through the agent's NL-interpretation branch.
 *
 * LIMITATION: The nl_query is an intermediate graph state not currently
 * exposed via the HTTP API. This evaluator extracts the NL description
 * from migration comments where the graph logs it. If comments don't
 * contain the NL description, it falls back gracefully.
 *
 * TODO: Request backend change to persist nl_query in the RuleMigrationRule
 * document for proper evaluation access.
 */
export const createNlDescriptionFaithfulnessEvaluator = (
  evaluators: DefaultEvaluators
): Evaluator<RuleExample, RuleMigrationResult> => ({
  name: 'NL Description Faithfulness',
  kind: 'LLM',
  evaluate: async ({ input, output, expected, metadata }): Promise<EvaluationResult> => {
    const ruleInput = input as RuleInput;

    const vendor = ruleInput?.original_rule?.vendor;
    const vendorCriteria =
      vendor && vendor !== 'splunk' ? NL_INTERPRETATION_VENDORS[vendor] : undefined;

    if (!vendorCriteria) {
      return {
        score: null,
        explanation: `Vendor "${vendor}" does not produce an NL description — evaluator skipped`,
      };
    }

    const sourceQuery = ruleInput.original_rule.query;
    if (!sourceQuery) {
      return { score: null, explanation: `No source ${vendorCriteria.sourceLabel} in input` };
    }

    const comments = output?.rule?.comments ?? [];
    const nlQueryComment = comments.find(
      (c) => c.created_by === 'assistant' && c.message.length > 50
    );
    const nlQuery = nlQueryComment?.message;

    if (!nlQuery) {
      return {
        score: null,
        explanation:
          'Could not extract NL description from migration comments. ' +
          'Backend change needed to persist nl_query in the rule migration document.',
      };
    }

    const criteriaEval = evaluators.criteria([
      `You are evaluating whether a natural language (NL) description faithfully captures ` +
        `the detection logic from a ${vendorCriteria.sourceLabel}.\n\n` +
        `SOURCE RULE:\n${sourceQuery.slice(0, 3000)}\n\n` +
        `GENERATED NL DESCRIPTION:\n${nlQuery.slice(0, 2000)}\n\n` +
        `Check if the NL description:\n` +
        `1. Captures ALL detection conditions from the source (negations, thresholds, constants like port numbers, boolean logic AND/OR)\n` +
        `2. ${vendorCriteria.dependencyCriterion}\n` +
        `3. Does NOT misrepresent logic from the source (e.g., flipping AND↔OR, missing negations)\n\n` +
        `Score YES if the NL description is faithful. Score NO if it is missing or misrepresenting logic.`,
    ]);

    try {
      return await criteriaEval.evaluate({ input, output, expected, metadata });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { score: null, label: 'ERROR', explanation: `LLM judge failed: ${msg.slice(0, 200)}` };
    }
  },
});
