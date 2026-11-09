/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { infraFailureResult, isNegativeControl, notApplicableResult } from './evaluator_helpers';
import type { DefendInsightsDatasetExample, DefendInsightsTaskOutput } from './types';

export const EXPECTED_INSIGHT_GROUPS_EVALUATOR_NAME = 'ExpectedInsightGroups';

/**
 * Ported from the legacy `customIncompatibleAntivirusEvaluator`: score is
 * `1 - failedChecks / totalChecks` with one check for the group count and three per expected
 * group (missing required paths, excluded paths present, unexpected paths).
 *
 * Differences: an empty result on the negative control is not a failure (it is the expected
 * outcome and is scored here as a single passing group-count check), and infra failures are
 * `task_error`, not zero.
 */
export const createExpectedInsightGroupsEvaluator = (): Evaluator<
  DefendInsightsDatasetExample,
  DefendInsightsTaskOutput
> => ({
  name: EXPECTED_INSIGHT_GROUPS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const infra = infraFailureResult(output);
    if (infra) return infra;
    if (!expected) return notApplicableResult('example has no expected output');
    if (output.status !== 'succeeded' || !output.insights) {
      return { score: 0, label: 'fail', explanation: output.error ?? `status ${output.status}` };
    }

    const { insights } = output;
    const { results: requirements } = expected;

    if (insights.length === 0 && isNegativeControl(expected)) {
      return { score: 1, label: 'pass', explanation: 'no insight groups, as expected' };
    }

    if (insights.length === 0) {
      return { score: 0, label: 'fail', explanation: 'no insight groups returned' };
    }

    const failedChecks: Array<{ label: string; details?: string[] }> = [];
    let totalChecks = 1;

    if (insights.length !== requirements.length) {
      failedChecks.push({
        label: 'number of insight groups does not match number of requirements',
        details: [`insights: ${insights.length}`, `requirements: ${requirements.length}`],
      });
    }

    for (const requirement of requirements) {
      const label = `requirement "${requirement.name}"`;
      const needle = requirement.name.toLowerCase();
      const matched = insights.find((insight) => insight.group.toLowerCase().includes(needle));
      totalChecks += 3;

      if (!matched) {
        failedChecks.push({ label: `${label} did not match any insight group` });
      }

      const eventPaths = (matched?.events ?? []).map((event) => event.value);
      const excluded = new Set(requirement.excludedPaths);
      const allowed = new Set([...requirement.requiredPaths, ...requirement.optionalPaths]);

      const missingRequired = [...new Set(requirement.requiredPaths)].filter(
        (path) => !eventPaths.includes(path)
      );
      // An unmatched group is already one failed check; don't double-count its empty paths.
      if (matched && missingRequired.length > 0) {
        failedChecks.push({
          label: `${label} is missing required paths`,
          details: missingRequired,
        });
      }

      const foundExcluded = eventPaths.filter((path) => excluded.has(path));
      if (foundExcluded.length > 0) {
        failedChecks.push({ label: `${label} contains excluded paths`, details: foundExcluded });
      }

      const unexpected = eventPaths.filter((path) => !allowed.has(path) && !excluded.has(path));
      if (unexpected.length > 0) {
        failedChecks.push({ label: `${label} contains unexpected paths`, details: unexpected });
      }
    }

    const score = Number((1 - failedChecks.length / totalChecks).toFixed(2));
    return {
      score,
      label: failedChecks.length === 0 ? 'pass' : 'fail',
      explanation:
        failedChecks.length === 0
          ? 'All checks passed'
          : failedChecks
              .map(({ label, details }) =>
                details?.length ? `${label}:\n  - ${details.join('\n  - ')}` : label
              )
              .join('\n'),
    };
  },
});
