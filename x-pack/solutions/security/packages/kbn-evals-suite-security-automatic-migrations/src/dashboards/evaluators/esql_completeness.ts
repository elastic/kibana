/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import { createEsqlValidityEvaluator } from '@kbn/evals';
import type { DashboardExample } from '../../../datasets/dashboards/types';
import type { MigrationResult } from '../migration_client';
import { extractEsqlQueries } from '../helpers';

interface ValidityQueryDetail {
  query: string;
  valid: boolean;
  errors: string[];
}

interface ValidityMetadata {
  totalQueries: number;
  validCount: number;
  invalidCount: number;
  queries: ValidityQueryDetail[];
}

export const createEsqlCompletenessEvaluator = (): Evaluator<DashboardExample, MigrationResult> => {
  const validityEvaluator = createEsqlValidityEvaluator<DashboardExample, MigrationResult>({
    queryExtractor: (output) => extractEsqlQueries(output).map(({ query }) => query),
    scoreOnEmptyQueries: 1,
  });

  return {
    name: 'ES|QL Completeness',
    kind: 'CODE',
    evaluate: async ({
      input,
      output,
      expected,
      metadata,
    }: {
      input: DashboardExample['input'];
      output: MigrationResult;
      expected: DashboardExample['output'];
      metadata: DashboardExample['metadata'];
    }): Promise<EvaluationResult> => {
      const translatedQueries = extractEsqlQueries(output);

      if (translatedQueries.length === 0) {
        return { score: null, explanation: 'No ES|QL queries found in output' };
      }

      const validityResult = await validityEvaluator.evaluate({
        input,
        output,
        expected,
        metadata,
      });

      const validityMeta = validityResult.metadata as ValidityMetadata | undefined;
      const totalQueries = validityMeta?.totalQueries ?? translatedQueries.length;
      const validCount = validityMeta?.validCount ?? translatedQueries.length;

      const score = validCount / totalQueries;

      // Correlate framework per-query details back to panel titles
      const queryToPanel = new Map(
        translatedQueries.map(({ panelTitle, query }) => [query, panelTitle])
      );

      const invalidPanels = (validityMeta?.queries ?? [])
        .filter((d) => !d.valid)
        .map((d) => ({ title: queryToPanel.get(d.query) ?? '', errors: d.errors }));

      const explanation =
        invalidPanels.length > 0
          ? `${validCount}/${totalQueries} queries are complete. Issues: ${invalidPanels
              .map((p) => `"${p.title}": ${p.errors.join('; ')}`)
              .join(' | ')}`
          : `All ${totalQueries} ES|QL queries are fully resolved`;

      return {
        score,
        explanation,
        metadata: {
          totalQueries,
          validQueries: validCount,
          invalidPanels,
          queries: translatedQueries.map(({ panelTitle, query }) => ({ panelTitle, query })),
        },
      };
    },
  };
};
