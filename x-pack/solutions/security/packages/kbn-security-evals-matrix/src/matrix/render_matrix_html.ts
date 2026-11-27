/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Matrix,
  MatrixCell,
  MatrixRow,
  MatrixDisplayColumn,
  TokenCostModel,
} from './build_matrix';
import type { MatrixColumnConfig, MatrixConfig } from './load_matrix_config';
import type { MatrixProvenance } from './render_matrix';
import type { MatrixTraceData, MatrixTraceEntry, TraceStep } from './trace_types';
import { traceKey, parseDirectTraceKey } from './trace_types';
import { renderReport } from '../report';
import type {
  ReportDocument,
  ReportExample,
  ReportProvenanceItem,
  ReportSection,
  ReportStep,
  ReportSummaryCell,
  ReportSummaryTable,
} from '../report';

/**
 * Resolves a direct trace for a `datasetIds`-restricted column: only a trace whose own
 * `datasetId` is in the column's allow-list AND whose suite is one of the column's
 * configured `suites` qualifies. Checking the dataset id alone is not enough — two selected
 * suites can reuse the same dataset id, and matching on dataset id only would let a trace
 * from an unrelated suite (never read by this column) win and get displayed as this
 * column's prompt/answer/score. Falling through to the suite-level key (as non-restricted
 * columns do) would attach another dataset's prompt/answer/score to this column, since that
 * key holds the suite's first complete example regardless of dataset.
 */
const findDatasetTrace = (
  traces: MatrixTraceData | undefined,
  modelId: string,
  column: MatrixColumnConfig
): MatrixTraceEntry | undefined => {
  if (!traces || !column.datasetIds?.length) {
    return undefined;
  }
  const allowedDatasets = new Set(column.datasetIds);
  const allowedSuites = new Set(column.suites);
  const modelPrefix = `${traceKey(modelId, '')}`;
  for (const [key, entry] of Object.entries(traces)) {
    if (key.startsWith(modelPrefix) && entry.datasetId && allowedDatasets.has(entry.datasetId)) {
      const parsed = parseDirectTraceKey(key);
      if (parsed && allowedSuites.has(parsed.suiteId)) {
        return entry;
      }
    }
  }
  return undefined;
};

/** Worst-case spread across repetitions as a `±` badge; empty for single-rep cells. */
const spreadLabel = (trace?: { spread?: Record<string, number> }): string => {
  const values = Object.values(trace?.spread ?? {});
  if (values.length === 0) {
    return '';
  }
  const worst = Math.max(...values);
  if (worst === 0) {
    return 'stable';
  }
  return `±${worst % 1 === 0 ? worst : worst.toFixed(2)}`;
};

/** Per-prompt score from the trace's own evaluator scores, when the trace has any. */
const variantScore = (
  trace: MatrixTraceEntry | undefined,
  column: MatrixColumnConfig | undefined,
  config: MatrixConfig
): string => {
  const scores = trace?.scores;
  if (!scores) {
    return '';
  }
  const excluded = config.excludeEvaluators ?? [];
  const allow = column?.evaluators;
  const values = Object.entries(scores)
    .filter(([name]) =>
      allow ? allow.includes(name) : !excluded.some((prefix) => name.startsWith(prefix))
    )
    .map(([, value]) => value);
  if (values.length === 0) {
    return '';
  }
  const scale = column?.scale ?? config.defaultScale ?? 10;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `score ${(mean * scale).toFixed(config.decimals ?? 2)}`;
};

/**
 * Maps a matrix cell onto the report model's summary cell. Cell badges (tier,
 * self-judged) and their tooltips fold into the text and a combined tooltip —
 * the underlying values stay visible.
 */
const summaryCell = (row: MatrixRow, column: MatrixDisplayColumn): ReportSummaryCell => {
  const cell =
    column.kind === 'overall' ? row.overall : row.cells[column.id] ?? { kind: 'missing' };
  switch (cell.kind) {
    case 'score': {
      const titles: string[] = [];
      let text = `✓ ${cell.value}`;
      // Self-judged scores must be visibly disclosed, not silently rendered
      // identically to independently judged ones (MatrixCell.selfJudged).
      if (cell.selfJudged) {
        text += ' SJ';
        titles.push('SJ: Scored by the same model being evaluated (allowed via allowSelfJudged)');
      }
      if (column.kind === 'overall' && row.tier !== undefined) {
        text += ` T${row.tier}`;
        titles.push(
          `Tie tier ${row.tier}: rows sharing a tier are not distinguishable at the measured run-to-run noise level, so their relative order is not meaningful`
        );
      }
      return { text, tone: 'ok', ...(titles.length ? { title: titles.join(' · ') } : {}) };
    }
    case 'not-recommended':
      // Mirror the CSV/MD disclosure: a failing self-judged score must be
      // distinguishable from an independently judged failure in HTML too.
      return {
        text: `⛔ fail${cell.selfJudged ? ' (self-judged)' : ''}`,
        tone: 'err',
      };
    case 'excluded':
      return {
        text: '⚠ excluded',
        tone: 'warn',
        title: `${cell.docs} score(s) rejected: ${cell.reason}`,
      };
    case 'insufficient-coverage':
      return {
        text: `${cell.covered}/${cell.required} cols`,
        tone: 'warn',
        title: `scored on ${cell.covered} of ${cell.required} required columns — too thin to aggregate`,
      };
    case 'insufficient-evaluators':
      return {
        text: `⚠ ${cell.evaluators.join(', ')} errored`,
        tone: 'warn',
        title: `evaluator(s) errored on every example and were dropped from the mean: ${cell.evaluators.join(
          ', '
        )} — a score here would rest on the surviving (often saturated) evaluators`,
      };
    case 'missing':
    default:
      return { text: '—', tone: 'ok' };
  }
};

const summaryTable = (matrix: Matrix): ReportSummaryTable => ({
  rowLabelHeader: 'Model',
  columns: matrix.displayColumns.map((col) => ({
    id: col.id,
    label: col.label,
    ...(col.group ? { group: col.group } : {}),
  })),
  rows: [...matrix.proprietary, ...matrix.openSource].map((row) => ({
    label: row.modelLabel,
    subtitle: `${row.modelId} · ${row.coverage.covered}/${row.coverage.total}`,
    cells: matrix.displayColumns.map((col) => summaryCell(row, col)),
  })),
});

const tokenCostTable = (matrix: Matrix): ReportSummaryTable | undefined => {
  if (!matrix.tokenCost || matrix.tokenCost.models.length === 0) {
    return undefined;
  }
  const fmt = (n?: number) =>
    n === undefined ? '—' : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${Math.round(n)}`;
  const cellFor = (m: TokenCostModel, colId: string): ReportSummaryCell => {
    const cell = m.cells.find((c) => c.columnId === colId);
    if (!cell) {
      return { text: '—', tone: 'ok' };
    }
    const title =
      cell.inputTokens && cell.outputTokens
        ? `in ${Math.round(cell.inputTokens.mean).toLocaleString()} / out ${Math.round(
            cell.outputTokens.mean
          ).toLocaleString()} (in min ${Math.round(
            cell.inputTokens.min
          ).toLocaleString()}, out min ${Math.round(cell.outputTokens.min).toLocaleString()})`
        : undefined;
    return {
      text: fmt(cell.totalMean),
      tone: 'ok',
      ...(title ? { title } : {}),
    };
  };
  return {
    rowLabelHeader: 'Model',
    caption:
      'Token cost per (model, column) — input + output means, native units (hover for in/out split)',
    columns: [
      ...matrix.columns.map((c) => ({ id: c.id, label: c.label })),
      { id: 'total', label: 'Total' },
    ],
    rows: matrix.tokenCost.models.map((m) => ({
      label: m.modelLabel,
      subtitle: m.modelId,
      cells: [
        ...matrix.columns.map((c) => cellFor(m, c.id)),
        {
          text: fmt(m.cells.reduce((sum, c) => sum + c.totalMean, 0)),
          tone: 'ok' as const,
        },
      ],
    })),
  };
};

const reportStep = (step: TraceStep): ReportStep => {
  if (step.type === 'tool') {
    return {
      kind: 'tool',
      ...(step.toolId !== undefined ? { toolId: step.toolId } : {}),
      ...(step.toolParams !== undefined ? { toolParams: step.toolParams } : {}),
    };
  }
  if (step.type === 'skill') {
    return { kind: 'skill', ...(step.skills ? { skills: step.skills } : {}) };
  }
  return { kind: 'think', ...(step.text !== undefined ? { text: step.text } : {}) };
};

const reportExample = (
  col: MatrixDisplayColumn,
  label: string,
  trace: MatrixTraceEntry | undefined,
  cell: MatrixCell,
  column: MatrixColumnConfig | undefined,
  config: MatrixConfig
): ReportExample => {
  const scoreStr =
    variantScore(trace, column, config) || (cell.kind === 'score' ? `score ${cell.value}` : '');
  const metaParts = [
    scoreStr,
    trace?.repetitions ? `${trace.repetitions} rep${trace.repetitions === 1 ? '' : 's'}` : '',
    spreadLabel(trace),
    trace?.stepCount ? `${trace.stepCount} steps` : '',
    trace?.toolCount ? `${trace.toolCount} tools` : '',
  ].filter(Boolean);

  // Card status mirrors the cell: only a scored cell is "completed"; every other
  // cell kind (excluded, insufficient-*, missing, ...) reads as missing.
  const status: ReportExample['status'] =
    cell.kind === 'score' ? 'completed' : cell.kind === 'not-recommended' ? 'failed' : 'missing';

  return {
    id: col.label,
    label,
    status,
    meta: metaParts,
    ...(trace?.question ? { question: trace.question } : {}),
    ...(trace?.toolTrail?.length ? { toolTrail: trace.toolTrail } : {}),
    ...(trace?.answer ? { answerMarkdown: trace.answer } : {}),
    ...(trace?.steps?.length ? { steps: trace.steps.map(reportStep) } : {}),
    // Scores only, no conversation: the suite is code-evaluated without an agent.
    ...(trace &&
    !trace.answer &&
    !trace.question &&
    (trace.stepCount ?? 0) === 0 &&
    Object.keys(trace.scores ?? {}).length > 0
      ? {
          emptyNote: 'No agent trace — this suite is evaluated without a conversational agent.',
        }
      : {}),
  };
};

const modelSections = (
  matrix: Matrix,
  config: MatrixConfig,
  traces?: MatrixTraceData
): ReportSection[] =>
  [...matrix.proprietary, ...matrix.openSource].map((row) => {
    const completed = matrix.displayColumns.filter((col) => {
      const cell = col.kind === 'overall' ? row.overall : row.cells[col.id];
      return cell && cell.kind === 'score';
    }).length;
    const total = matrix.displayColumns.length;

    const examples: ReportExample[] = matrix.displayColumns
      // Only base columns have a prompt/experiment behind them: composite and legacy
      // Overall columns are derived aggregates, and rendering them here produced
      // "Trace unavailable" cards for a prompt that was never run.
      .filter((col) => col.kind === 'base')
      .flatMap((col) => {
        const cell =
          col.kind === 'overall' ? row.overall : row.cells[col.id] ?? { kind: 'missing' };
        const column = config.columns.find((c) => c.id === col.id);
        // One card per fetched example matching a column prefix — the suffix set is open, so
        // enumerate actual trace keys instead of hard-coding -a/-b/-c variants.
        const variantTraces: Array<{ label: string; trace: MatrixTraceEntry | undefined }> = [];
        if (column?.examplePrefixes?.length) {
          const modelKeyPrefix = `${traceKey(row.modelId, '')}`;
          const matchingKeys = Object.keys(traces ?? {}).filter((key) =>
            key.startsWith(modelKeyPrefix)
          );
          for (const key of matchingKeys) {
            // Direct example keys are suite-scoped (`model:suite:example`); other
            // keys (`model:prefix:<p>`, `model:<colId>`) carry the id verbatim.
            const example = parseDirectTraceKey(key)?.exampleId ?? key.slice(modelKeyPrefix.length);
            // Same bucketing rule as the score path (scoresByPrefixToDatasets): an
            // example belongs to a prefix when it IS the prefix or extends it with a
            // hyphen. A bare startsWith also claims a longer sibling prefix's
            // examples (e.g. 'alert' claiming 'alert-analysis-a'), cross-assigning
            // traces between columns.
            if (column.examplePrefixes.some((p) => example === p || example.startsWith(`${p}-`))) {
              variantTraces.push({ label: example, trace: traces?.[key] });
            }
          }
          variantTraces.sort((a, b) => a.label.localeCompare(b.label));
        }
        const fallbackTrace =
          traces?.[traceKey(row.modelId, col.id)] ??
          // examplePrefixes columns consume synthetic `prefix:<p>` datasets.
          column?.examplePrefixes
            ?.map((p) => traces?.[traceKey(row.modelId, `prefix:${p}`)])
            .find((t) => t != null) ??
          // `datasetIds`-restricted columns must resolve a direct trace from their own
          // dataset: the suite-level key below holds the suite's first complete example
          // regardless of dataset, so falling through to it would label another dataset's
          // prompt/answer/score as this column's. Whether or not a dataset-scoped trace
          // exists, an unmatched dataset column stays unavailable rather than borrowing one.
          (column?.datasetIds?.length
            ? findDatasetTrace(traces, row.modelId, column)
            : // Column ids differ from suite ids, so fall back to the column's suites.
              column?.suites.map((s) => traces?.[traceKey(row.modelId, s)]).find((t) => t != null));
        const cards =
          variantTraces.length > 0 ? variantTraces : [{ label: col.id, trace: fallbackTrace }];
        return cards.map(({ label, trace }) =>
          reportExample(col, label, trace, cell, column, config)
        );
      });

    return {
      id: row.modelId,
      title: row.modelLabel,
      subtitle: row.modelId,
      completion: `${completed}/${total} completed`,
      examples,
    };
  });

/**
 * Renders a self-contained HTML report, with per-prompt traces when `traces` is provided.
 * The matrix is mapped onto a generic `ReportDocument` and rendered through the shared
 * report adapters; matrix-specific bits (cell badges, token cost) live in the mapper only.
 */
export const renderMatrixHtml = (
  matrix: Matrix,
  config: MatrixConfig,
  provenance: MatrixProvenance = {},
  traces?: MatrixTraceData
): string => {
  const provenanceCandidates: Array<ReportProvenanceItem | undefined> = [
    provenance.branch ? `branch \`${provenance.branch}\`` : undefined,
    provenance.branchBySuite && Object.keys(provenance.branchBySuite).length > 0
      ? `suite branches ${Object.entries(provenance.branchBySuite)
          .map(([suite, branchValue]) => {
            const value = Array.isArray(branchValue) ? branchValue.join('|') : branchValue;
            return `${suite}->${value}`;
          })
          .join(', ')}`
      : undefined,
    provenance.lookbackDays !== undefined ? `${provenance.lookbackDays}-day lookback` : undefined,
    provenance.asOf !== undefined
      ? `as of ${new Date(provenance.asOf).toISOString().slice(0, 10)} (later runs excluded)`
      : undefined,
    provenance.commitSha ? `commit \`${provenance.commitSha}\`` : undefined,
    provenance.buildUrl
      ? // Only http(s) build URLs become links; anything else renders as plain text.
        { text: 'build', href: provenance.buildUrl }
      : undefined,
    provenance.fixtureFingerprint ? `fixtures \`${provenance.fixtureFingerprint}\`` : undefined,
  ];
  const provenanceItems = provenanceCandidates.filter(
    (item): item is ReportProvenanceItem => item !== undefined
  );

  const saturated = matrix.evaluatorSaturation.filter((entry) => entry.saturated);
  const saturationNote =
    saturated.length > 0
      ? [
          `Overall excludes ${saturated.length} non-discriminating evaluator(s): ` +
            `${saturated
              .map(
                (entry) =>
                  `${entry.evaluatorName} (spread ${entry.range.toFixed(2)} across ${
                    entry.observations
                  } models)`
              )
              .join(', ')}. ` +
            `These score every model within a narrow band, so averaging them into Overall ` +
            `divides the discriminating evaluators' signal without adding ranking information. ` +
            `Per-column cells are unaffected.`,
        ]
      : [];

  const extraTables = tokenCostTable(matrix);

  const doc: ReportDocument = {
    title: config.title,
    provenance: provenanceItems,
    notes: [...(provenance.methodologyNotes ?? []), ...saturationNote],
    summaryTable: summaryTable(matrix),
    ...(extraTables ? { summaryTables: [extraTables] } : {}),
    legend:
      "Each cell shows the model's score (0–10). Expand a prompt below to read the agent's full answer, tool trail, and reasoning trace.",
    sections: modelSections(matrix, config, traces),
  };

  const result = renderReport(doc, 'html');
  if (result.fellBackTo !== 'none') {
    throw new Error(`matrix HTML report rendering failed: ${result.error}`);
  }
  return result.output;
};
