/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example, Run } from 'langsmith';
import { EvaluatorT } from 'langsmith/evaluation';
import { DefendInsights } from '@kbn/elastic-assistant-common';
import { EVALUATOR_ERRORS } from './constants';

export interface ExampleOutput {
  // Example is a LangSmith name for datasets
  results: Array<{
    name: string; // e.g. "Windows Defender"
    requiredPaths: string[];
    optionalPaths: string[];
    excludedPaths: string[];
  }>;
}

export const isValidExampleOutput = (output: ExampleOutput): output is ExampleOutput => {
  // Check if output is an object and has the expected structure. It's defined in LangSmith, hence needs validation.
  const isStringArray = (arr: string[] | unknown): arr is string[] =>
    Array.isArray(arr) && arr.every((item) => typeof item === 'string');

  return (
    output &&
    Array.isArray(output.results) &&
    output.results.every(
      (res) =>
        typeof res.name === 'string' &&
        isStringArray(res.requiredPaths) &&
        isStringArray(res.optionalPaths) &&
        isStringArray(res.excludedPaths)
    )
  );
};

const failWithComment = (comment: string) => ({
  key: 'correct',
  score: 0,
  comment,
});

export const customIncompatibleAntivirusEvaluator: EvaluatorT = (
  run: Run,
  example: Example | undefined
) => {
  const rawOutput = example?.outputs as ExampleOutput;
  if (!isValidExampleOutput(rawOutput)) {
    return failWithComment(EVALUATOR_ERRORS.INVALID_OUTPUT_STRUCTURE);
  }

  const { results: requirements } = rawOutput;
  const insights: DefendInsights = run.outputs?.insights ?? [];

  if (!Array.isArray(insights) || insights.length === 0) {
    return failWithComment(EVALUATOR_ERRORS.NO_RESULTS);
  }

  const failedChecks: Array<{ label: string; details?: string[] }> = [];
  let totalChecks = 0;

  // Check: group count matches requirement count
  totalChecks += 1;
  if (insights.length !== requirements.length) {
    failedChecks.push({
      label: 'number of insight groups does not match number of requirements',
      details: [`insights: ${insights.length}`, `requirements: ${requirements.length}`],
    });
  }

  for (const req of requirements) {
    const label = `requirement "${req.name}"`;

    const matchedInsight = insights.find((insight) =>
      insight.group.toLowerCase().includes(req.name.toLowerCase())
    );

    totalChecks += 3;

    if (!matchedInsight) {
      failedChecks.push({
        label: `${label} did not match any insight group`,
      });
    } else {
      const eventPaths = (matchedInsight.events || []).map((e) => e.value);

      const requiredSet = new Set(req.requiredPaths);
      const excludedSet = new Set(req.excludedPaths);
      const allowedSet = new Set([...req.requiredPaths, ...req.optionalPaths]);

      const missingRequired = [...requiredSet].filter((p) => !eventPaths.includes(p));
      if (missingRequired.length) {
        failedChecks.push({
          label: `${label} is missing required paths`,
          details: missingRequired,
        });
      }

      const foundExcluded = eventPaths.filter((p) => excludedSet.has(p));
      if (foundExcluded.length) {
        failedChecks.push({
          label: `${label} contains excluded paths`,
          details: foundExcluded,
        });
      }

      const unexpected = eventPaths.filter((p) => !allowedSet.has(p) && !excludedSet.has(p));
      if (unexpected.length) {
        failedChecks.push({
          label: `${label} contains unexpected paths`,
          details: unexpected,
        });
      }
    }
  }

  const score = totalChecks === 0 ? 0 : Number((1 - failedChecks.length / totalChecks).toFixed(2));

  const comment = failedChecks.length
    ? `Failed checks:\n${failedChecks
        .map((c) => (c.details?.length ? `${c.label}:\n  - ${c.details.join('\n  - ')}` : c.label))
        .join('\n\n')}`
    : 'All checks passed';

  return {
    key: 'correct',
    score,
    comment,
  };
};
