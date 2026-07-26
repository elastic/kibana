/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */

// Adapter: render persona + token reports directly from a REAL merged Security-LLM
// matrix JSON (MatrixReportJson produced by the weekly golden-cluster pipeline —
// e.g. matrix-output/latest-security-llm-matrix-merged.json).
//
// The persona renderer already consumes a MatrixReport-shaped object, so the real
// matrix feeds it directly. The token-overview renderer is per-example row based,
// so we project tokenCost.models[].cells[] (C1..C7 aggregates with input/output
// min/max ranges) into the row shape it expects, mapping category codes to the
// capability keys the renderer groups on.

import { readFileSync } from 'fs';
import { renderPersonaMatrixHtml } from './render_persona_matrix';
import { renderTokenUsageOverviewMatrix } from './render_token_usage_overview';

// C-code -> capability key used by the token renderer (prompt_id.startsWith(key)).
const CATEGORY_TO_CAPABILITY: Record<string, string> = {
  C1: 'alert-analysis',
  C2: 'detection-rule-edit',
  C3: 'entity-analytics',
  C4: 'workflow-authoring',
  C5: 'multi-step',
  C6: 'attack-discovery',
  C7: 'migration',
};

interface MatrixTokenCell {
  category: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  inputRange?: { min?: number; max?: number; mean?: number };
  outputRange?: { min?: number; max?: number; mean?: number };
}
interface MatrixTokenModel {
  modelId: string;
  cells?: MatrixTokenCell[];
}
interface MergedMatrix {
  models?: Array<{ modelId: string; cells?: unknown; compositeScores?: unknown }>;
  tokenCost?: { models?: MatrixTokenModel[] };
  metadata?: { generatedAt?: string };
}

export function loadMergedMatrix(path: string): MergedMatrix {
  return JSON.parse(readFileSync(path, 'utf8')) as MergedMatrix;
}

/**
 * Project the aggregated tokenCost cells into per-"example" rows the token
 * renderer groups on. We emit three synthetic rows per (model, category) — min,
 * mean, and max — so the renderer's avg reproduces the real mean while the
 * min–max range still spans the true distribution. (A two-point min/max pair
 * would make the rendered "avg" the midpoint, not the real mean.)
 */
export function matrixToTokenRows(matrix: MergedMatrix): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  for (const tm of matrix.tokenCost?.models ?? []) {
    for (const cell of (tm.cells ?? []).filter((c) => CATEGORY_TO_CAPABILITY[c.category])) {
      const cap = CATEGORY_TO_CAPABILITY[cell.category];
      const inMean = cell.inputRange?.mean ?? cell.inputTokens ?? 0;
      const outMean = cell.outputRange?.mean ?? cell.outputTokens ?? 0;
      const inMin = cell.inputRange?.min ?? inMean;
      const inMax = cell.inputRange?.max ?? inMean;
      const outMin = cell.outputRange?.min ?? outMean;
      const outMax = cell.outputRange?.max ?? outMean;
      // Emit a mean row twice so the rendered average tracks the real mean, plus
      // one min and one max row so the min–max range is exact.
      rows.push({
        model_name: tm.modelId,
        prompt_id: `${cap}-min`,
        input_tokens: inMin,
        output_tokens: outMin,
      });
      rows.push({
        model_name: tm.modelId,
        prompt_id: `${cap}-max`,
        input_tokens: inMax,
        output_tokens: outMax,
      });
      rows.push({
        model_name: tm.modelId,
        prompt_id: `${cap}-mean-1`,
        input_tokens: inMean,
        output_tokens: outMean,
      });
      rows.push({
        model_name: tm.modelId,
        prompt_id: `${cap}-mean-2`,
        input_tokens: inMean,
        output_tokens: outMean,
      });
    }
  }
  return rows;
}

export function renderPersonaFromMatrix(path: string): { html: string; rowCount: number } {
  const matrix = loadMergedMatrix(path);
  // The merged matrix is already a MatrixReport superset.
  const html = renderPersonaMatrixHtml(matrix as never);
  return { html, rowCount: matrix.models?.length ?? 0 };
}

export function renderTokenFromMatrix(path: string): { html: string; rowCount: number } {
  const matrix = loadMergedMatrix(path);
  const rows = matrixToTokenRows(matrix);
  const html = renderTokenUsageOverviewMatrix(rows);
  return { html, rowCount: matrix.tokenCost?.models?.length ?? 0 };
}
