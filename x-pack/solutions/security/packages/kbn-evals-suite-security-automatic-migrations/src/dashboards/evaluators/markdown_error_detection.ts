/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { DashboardExample } from '../../../datasets/dashboards/types';
import type { MigrationResult } from '../migration_client';
import { parsePanels, markdownHasError } from '../helpers';

export const createMarkdownErrorDetectionEvaluator = (): Evaluator<
  DashboardExample,
  MigrationResult
> => ({
  name: 'Markdown Error Detection',
  kind: 'CODE',
  evaluate: async ({
    output,
  }: {
    input: unknown;
    output: MigrationResult;
    expected: unknown;
    metadata: unknown;
  }): Promise<EvaluationResult> => {
    const allPanels: Array<{ title: string; isMarkdown: boolean; hasError: boolean }> = [];

    for (const dashboard of output.dashboards) {
      const panels = parsePanels(dashboard);
      for (const panel of panels) {
        // Markdown panels have visualizationType 'lnsMarkdown' or type 'markdown' in embeddableConfig
        // The content lives in embeddableConfig.attributes.state.visualization.shape (markdown panels)
        // or we detect by checking if there is no textBased datasource and there is a markdown content field
        const attrs = panel.embeddableConfig?.attributes as
          | { visualizationType?: string; state?: { visualization?: Record<string, unknown> } }
          | undefined;
        const isMarkdown =
          attrs?.visualizationType === 'lnsMarkdown' ||
          (panel as Record<string, unknown>).type === 'markdown';

        let hasError = false;
        if (isMarkdown) {
          const vizState = attrs?.state?.visualization;
          // Markdown content is stored in visualization.shape for lnsMarkdown
          const content = vizState?.shape ?? vizState?.content;
          if (typeof content === 'string') {
            hasError = markdownHasError(content);
          }
        }
        allPanels.push({ title: panel.title ?? '', isMarkdown, hasError });
      }
    }

    if (allPanels.length === 0) {
      return { score: null, explanation: 'No panels found in output' };
    }

    const errorPanels = allPanels.filter((p) => p.hasError);
    const cleanPanels = allPanels.length - errorPanels.length;
    const score = cleanPanels / allPanels.length;

    const explanation =
      errorPanels.length > 0
        ? `${errorPanels.length} markdown panel(s) contain errors: ${errorPanels
            .map((p) => `"${p.title}"`)
            .join(', ')}`
        : `All ${allPanels.length} panels are clean (no markdown errors)`;

    return {
      score,
      explanation,
      metadata: {
        totalPanels: allPanels.length,
        markdownPanels: allPanels.filter((p) => p.isMarkdown).length,
        errorPanels: errorPanels.map((p) => p.title),
      },
    };
  },
});
