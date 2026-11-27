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
 * Generic words a model appends to a vendor name ("Avast Antivirus", "Kaspersky Total Security").
 * The AV prompt asks for "the antivirus program" as the group, so the vendor name is the stable part.
 */
const GENERIC_GROUP_SUFFIXES = new Set([
  'antivirus',
  'anti-virus',
  'antimalware',
  'anti-malware',
  'security',
  'software',
  'total',
  'internet',
  'free',
  'premium',
  'pro',
]);

/**
 * Trims, lowercases, collapses whitespace and drops trailing generic words, so the comparison is on
 * the vendor/product name instead of a substring (which would let "Avast" match "Not Avast").
 */
export const normalizeGroupName = (group: string): string => {
  const words = group.trim().toLowerCase().split(/\s+/).filter(Boolean);
  while (words.length > 1 && GENERIC_GROUP_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
};

/**
 * A group matches when its normalized name equals the vendor or starts with it followed by a word
 * boundary, which accepts vendor-suffixed names ("Kaspersky Lab", "Malwarebytes Inc") but not a
 * longer word ("Avastx") or a name that merely contains the vendor ("Not Avast").
 */
export const groupMatchesVendor = (group: string, vendor: string): boolean => {
  const normalizedGroup = normalizeGroupName(group);
  const normalizedVendor = normalizeGroupName(vendor);
  return normalizedGroup === normalizedVendor || normalizedGroup.startsWith(`${normalizedVendor} `);
};

/**
 * Ported from the legacy `customIncompatibleAntivirusEvaluator`: score is
 * `1 - failedChecks / totalChecks` with three checks per expected group (group present, no missing
 * required paths, no excluded or unexpected paths) plus one check per unexpected extra group, so an
 * invented group costs the same as a missing one. `label` is `pass` only when the score is 1.
 *
 * Differences: an empty result on the negative control is the expected outcome (score 1), and infra
 * failures (including a run whose model saw no seeded events) are `task_error`, not zero.
 */
export const createExpectedInsightGroupsEvaluator = (): Evaluator<
  DefendInsightsDatasetExample,
  DefendInsightsTaskOutput
> => ({
  name: EXPECTED_INSIGHT_GROUPS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const infra = infraFailureResult(output, expected);
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
    const unclaimed = [...insights];
    let totalChecks = 0;

    for (const requirement of requirements) {
      const label = `requirement "${requirement.name}"`;
      const matchIndex = unclaimed.findIndex((insight) =>
        groupMatchesVendor(insight.group, requirement.name)
      );
      const matched = matchIndex === -1 ? undefined : unclaimed.splice(matchIndex, 1)[0];
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

    for (const extra of unclaimed) {
      totalChecks += 1;
      failedChecks.push({
        label: `unexpected insight group "${extra.group}"`,
        details: (extra.events ?? []).map((event) => event.value),
      });
    }

    const passed = failedChecks.length === 0;
    // Rounding must not turn a failing run into a 1.
    const score = passed
      ? 1
      : Math.min(0.99, Number((1 - failedChecks.length / totalChecks).toFixed(2)));
    return {
      score,
      label: passed ? 'pass' : 'fail',
      explanation: passed
        ? 'All checks passed'
        : failedChecks
            .map(({ label, details }) =>
              details?.length ? `${label}:\n  - ${details.join('\n  - ')}` : label
            )
            .join('\n'),
    };
  },
});
