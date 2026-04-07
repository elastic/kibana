/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { DashboardExample } from '../../../datasets/dashboards/types';
import type { MigrationResult } from '../migration_client';
import { extractEsqlQueries } from '../helpers';

export const createEsqlSyntaxValidityEvaluator = (): Evaluator<
  DashboardExample,
  MigrationResult
> => ({
  name: 'ES|QL Syntax Validity',
  kind: 'CODE',
  evaluate: async ({
    output,
  }: {
    input: unknown;
    output: MigrationResult;
    expected: unknown;
    metadata: unknown;
  }): Promise<EvaluationResult> => {
    // Extract queries from the parsed elastic_dashboard.data panels
    const translatedQueries = extractEsqlQueries(output);

    if (translatedQueries.length === 0) {
      return { score: null, explanation: 'No ES|QL queries found in output' };
    }

    // Check for macro/lookup placeholder patterns that indicate partial translation
    const panelsWithIssues: Array<{ title: string; issues: string[] }> = [];
    const validQueries: Array<{ panelTitle: string; query: string }> = [];

    for (const { panelTitle, query } of translatedQueries) {
      const issues: string[] = [];
      if (/\[(macro|lookup):.*?\]/i.test(query)) {
        issues.push('Contains unresolved macro/lookup placeholder');
      }
      if (issues.length > 0) {
        panelsWithIssues.push({ title: panelTitle, issues });
      } else {
        validQueries.push({ panelTitle, query });
      }
    }

    const score = validQueries.length / translatedQueries.length;

    const errorDetails = panelsWithIssues.map((p) => `"${p.title}": ${p.issues.join('; ')}`);

    const explanation =
      panelsWithIssues.length > 0
        ? `${validQueries.length}/${
            translatedQueries.length
          } queries are valid. Issues: ${errorDetails.join(' | ')}`
        : `All ${translatedQueries.length} ES|QL queries are syntactically valid`;

    return {
      score,
      explanation,
      metadata: {
        totalQueries: translatedQueries.length,
        validQueries: validQueries.length,
        invalidPanels: panelsWithIssues.map((p) => ({ title: p.title, errors: p.issues })),
      },
    };
  },
});
