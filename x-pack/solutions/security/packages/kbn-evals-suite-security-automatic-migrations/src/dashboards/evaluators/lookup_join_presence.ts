/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { DashboardExample, DashboardExpected } from '../../../datasets/dashboards/types';
import type { MigrationResult } from '../migration_client';
import { extractEsqlQueries, esqlHasLookupJoin } from '../helpers';

export const createLookupJoinPresenceEvaluator = (): Evaluator<
  DashboardExample,
  MigrationResult
> => ({
  name: 'Lookup Join Presence',
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
    const panelsNeedingLookup = panels.filter((p) => p.has_lookups);

    if (panelsNeedingLookup.length === 0) {
      return { score: null, explanation: 'No panels with lookups in expected output' };
    }

    const translatedQueries = extractEsqlQueries(output);
    const queryByTitle = new Map(
      translatedQueries.map(({ panelTitle, query }) => [panelTitle.toLowerCase(), query])
    );

    let panelsWithLookupJoin = 0;
    const missingPanels: string[] = [];

    for (const panel of panelsNeedingLookup) {
      const query = queryByTitle.get(panel.title.toLowerCase());
      if (query && esqlHasLookupJoin(query)) {
        panelsWithLookupJoin++;
      } else {
        missingPanels.push(panel.title);
      }
    }

    const score = panelsWithLookupJoin / panelsNeedingLookup.length;
    const explanation =
      missingPanels.length > 0
        ? `${panelsWithLookupJoin}/${
            panelsNeedingLookup.length
          } panels have LOOKUP JOIN. Missing: ${missingPanels.join(', ')}`
        : `All ${panelsNeedingLookup.length} panels correctly use LOOKUP JOIN`;

    return {
      score,
      explanation,
      metadata: {
        panelsNeedingLookup: panelsNeedingLookup.length,
        panelsWithLookupJoin,
        missingPanels,
      },
    };
  },
});
