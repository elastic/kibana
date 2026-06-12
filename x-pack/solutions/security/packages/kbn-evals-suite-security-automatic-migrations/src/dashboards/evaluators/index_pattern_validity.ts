/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { DashboardExample, DashboardExpected } from '../../../datasets/dashboards/types';
import type { MigrationResult } from '../migration_client';
import { extractIndexPatterns } from '../helpers';

export const createIndexPatternValidityEvaluator = (): Evaluator<
  DashboardExample,
  MigrationResult
> => ({
  name: 'Index Pattern Validity',
  kind: 'CODE',
  evaluate: async ({
    output,
    expected,
  }: {
    input: unknown;
    output: MigrationResult;
    expected: DashboardExpected | undefined;
    metadata: unknown;
  }): Promise<EvaluationResult> => {
    const panels = expected?.panels ?? [];
    const panelsWithExpectedIndex = panels.filter((p) => p.index_pattern != null);

    if (panelsWithExpectedIndex.length === 0) {
      return { score: null, explanation: 'No panels with expected index patterns in dataset' };
    }

    const actualPatterns = extractIndexPatterns(output);
    const actualByTitle = new Map<string, string[]>();
    for (const { panelTitle, indexPattern } of actualPatterns) {
      const key = panelTitle.toLowerCase();
      const existing = actualByTitle.get(key);
      if (existing) {
        existing.push(indexPattern);
      } else {
        actualByTitle.set(key, [indexPattern]);
      }
    }

    let matchingPanels = 0;
    const mismatches: Array<{ title: string; expected: string; actual: string | null }> = [];

    for (const panel of panelsWithExpectedIndex) {
      const actuals = actualByTitle.get(panel.title.toLowerCase());
      const actual = actuals?.find((a) => a === panel.index_pattern) ?? actuals?.[0] ?? null;
      if (actual === panel.index_pattern) {
        matchingPanels++;
      } else {
        mismatches.push({
          title: panel.title,
          expected: panel.index_pattern as string,
          actual,
        });
      }
    }

    const score = matchingPanels / panelsWithExpectedIndex.length;
    const explanation =
      mismatches.length > 0
        ? `${matchingPanels}/${
            panelsWithExpectedIndex.length
          } panels have correct index patterns. Mismatches: ${mismatches
            .map((m) => `"${m.title}" (expected: ${m.expected}, got: ${m.actual ?? 'none'})`)
            .join(', ')}`
        : `All ${panelsWithExpectedIndex.length} panels have correct index patterns`;

    return {
      score,
      explanation,
      metadata: {
        panelsWithExpectedIndex: panelsWithExpectedIndex.length,
        matchingPanels,
        mismatches,
      },
    };
  },
});
