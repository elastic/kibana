/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleInput } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

/**
 * QRadar-only evaluator that checks whether the NL description (nl_query)
 * faithfully captures all detection logic from the source QRadar XML.
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

    if (ruleInput?.original_rule?.vendor !== 'qradar') {
      return { score: null, explanation: 'Not a QRadar rule — evaluator skipped' };
    }

    const sourceXml = ruleInput.original_rule.query;
    if (!sourceXml) {
      return { score: null, explanation: 'No source QRadar XML in input' };
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
        `the detection logic from a QRadar XML rule definition.\n\n` +
        `SOURCE QRADAR XML RULE:\n${sourceXml.slice(0, 3000)}\n\n` +
        `GENERATED NL DESCRIPTION:\n${nlQuery.slice(0, 2000)}\n\n` +
        `Check if the NL description:\n` +
        `1. Captures ALL test conditions from the XML (negations, thresholds, constants like port numbers, boolean logic AND/OR)\n` +
        `2. References all dependencies (building blocks, sub-rules) that were fetched and expanded\n` +
        `3. Resolves reference sets to lookup index names or explicitly marks them as unresolved\n` +
        `4. Does NOT misrepresent logic from the XML (e.g., flipping AND↔OR, missing negations)\n\n` +
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
