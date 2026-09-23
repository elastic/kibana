/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MatrixColumnConfig,
  MatrixCompositeConfig,
  MatrixConfig,
  MatrixModelConfig,
  MatrixTokenCostConfig,
} from './load_matrix_config';
import type {
  AggregatedEvaluatorScore,
  AggregatedModelScores,
  AggregatedSuiteScores,
  ExcludedScoreCounts,
} from './query_matrix_scores';
import { detectSaturatedEvaluators, saturatedEvaluatorNames } from './evaluator_saturation';
import type { EvaluatorSaturation } from './evaluator_saturation';

/** A single matrix cell: either a numeric 0-10 score or "Not recommended". */
export type MatrixCell =
  /** `selfJudged` marks a score graded by the model itself (allowed via `allowSelfJudged`); consumers must disclose it. */
  | { kind: 'score'; value: number; selfJudged?: boolean }
  /** Below the recommendation threshold; still a run that happened, so it counts as measured. */
  | { kind: 'not-recommended'; selfJudged?: boolean }
  /** The model ran, but every score was rejected by judge policy. */
  | { kind: 'excluded'; reason: 'self-judged' | 'non-eis-judge' | 'same-family'; docs: number }
  /** Too few scored columns for an aggregate (`config.minCoverage`); only produced for `Overall`. */
  | { kind: 'insufficient-coverage'; covered: number; required: number }
  /** A cell-relevant evaluator errored on every example, so the mean would rest on the survivors. */
  | { kind: 'insufficient-evaluators'; evaluators: string[] }
  | { kind: 'missing' };

/** Synthetic id for the legacy single "Overall" column. */
export const OVERALL_COLUMN_ID = '__overall__';

/** A column as rendered, left-to-right, including derived composite columns. */
export interface MatrixDisplayColumn {
  id: string;
  label: string;
  group?: string;
  kind: 'base' | 'composite' | 'overall';
}

export interface MatrixRow {
  modelId: string;
  modelLabel: string;
  openSource: boolean;
  /** Column/composite id -> cell. */
  cells: Record<string, MatrixCell>;
  overall: MatrixCell;
  /** Deterministic code/contract evaluator mean on the same 0–10 scale. */
  capability?: MatrixCell;
  /** Judged evaluator mean on the same 0–10 scale. */
  judgedQuality?: MatrixCell;
  /** Base columns with a scored cell out of all base columns. */
  coverage: { covered: number; total: number };
  /** Distinct commits this row's scores were produced against (suites run on independent schedules). */
  commitShas?: string[];
  /** 1-based tier; rows within a tier are statistically tied. */
  tier?: number;
}

/** Aggregated token magnitudes for one (model, column) pair, in native units. */
export interface TokenCostCell {
  /** Base column id (matches `MatrixDisplayColumn.id`). */
  columnId: string;
  inputTokens?: TokenStat;
  outputTokens?: TokenStat;
  /** Sum of the input + output means. */
  totalMean: number;
}

export interface TokenStat {
  mean: number;
  min: number;
  max: number;
  count: number;
}

export interface TokenCostModel {
  modelId: string;
  modelLabel: string;
  openSource: boolean;
  cells: TokenCostCell[];
}

export interface Matrix {
  columns: Array<{ id: string; label: string; group?: string }>;
  composites: Array<{ id: string; label: string; group?: string }>;
  /** Full ordered render list (base + composite + legacy overall). */
  displayColumns: MatrixDisplayColumn[];
  overallLabel: string;
  /** Per-evaluator ranking power; `saturated` ones are excluded from Overall when the config opts in. */
  evaluatorSaturation: EvaluatorSaturation[];
  proprietary: MatrixRow[];
  openSource: MatrixRow[];
  /** Present only when the config opts into the token axis. */
  tokenCost?: { models: TokenCostModel[] };
}

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const matchesModel = (modelConfig: MatrixModelConfig, modelId: string): boolean =>
  modelConfig.id === modelId || (modelConfig.matchIds?.includes(modelId) ?? false);

const isExcludedEvaluator = (evaluatorName: string, excluded: readonly string[]): boolean =>
  excluded.some((entry) => evaluatorName.startsWith(entry));

const toCell = (
  value: number,
  config: MatrixConfig,
  { selfJudged = false }: { selfJudged?: boolean } = {}
): MatrixCell =>
  value <= config.notRecommendedBelow
    ? { kind: 'not-recommended', ...(selfJudged ? { selfJudged: true } : {}) }
    : { kind: 'score', value, ...(selfJudged ? { selfJudged: true } : {}) };

/** Sample count doubles as the aggregation weight; zero-count evaluators still count once. */
const weightOf = (evaluator: AggregatedEvaluatorScore): number =>
  evaluator.count > 0 ? evaluator.count : 1;

/** Yields every evaluator contributing to a column, applying the suite/dataset filters. */
function* columnEvaluators(
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig
): Generator<AggregatedEvaluatorScore> {
  const suiteSet = new Set(column.suites);
  // `examplePrefixes` map to the synthetic `prefix:<name>` datasets produced by queryMatrixScores.
  const datasetSet = column.examplePrefixes
    ? new Set(column.examplePrefixes.map((prefix) => `prefix:${prefix}`))
    : column.datasetIds
    ? new Set(column.datasetIds)
    : undefined;

  for (const suite of modelScores.suites) {
    if (suiteSet.has(suite.suiteId)) {
      for (const dataset of suite.datasets) {
        if (!datasetSet || datasetSet.has(dataset.datasetId)) {
          yield* dataset.evaluators;
        }
      }
    }
  }
}

const columnErroredOutEvaluators = (
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig
): string[] => {
  const suiteSet = new Set(column.suites);
  const datasetSet = column.examplePrefixes
    ? new Set(column.examplePrefixes.map((prefix) => `prefix:${prefix}`))
    : column.datasetIds
    ? new Set(column.datasetIds)
    : undefined;

  const names = new Set<string>();
  for (const suite of modelScores.suites) {
    if (suiteSet.has(suite.suiteId)) {
      for (const dataset of suite.datasets) {
        if (!datasetSet || datasetSet.has(dataset.datasetId)) {
          for (const name of dataset.erroredOutEvaluators ?? []) {
            names.add(name);
          }
        }
      }
    }
  }
  return [...names];
};

/**
 * Weighted mean (by sample count) of the evaluator scores mapped to a column.
 * Returns `undefined` when no scores contribute.
 */
const computeColumnMean = (
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig,
  excludeEvaluators: readonly string[],
  includeEvaluator?: (evaluator: AggregatedEvaluatorScore) => boolean
): number | undefined => {
  const evaluatorSet = column.evaluators ? new Set(column.evaluators) : undefined;

  let weightedSum = 0;
  let totalCount = 0;

  for (const evaluator of columnEvaluators(modelScores, column)) {
    if (!includeEvaluator || includeEvaluator(evaluator)) {
      // Without an allowlist, the exclusion list drops raw-magnitude evaluators that would break the 0-10 scale.
      const skip = evaluatorSet
        ? !evaluatorSet.has(evaluator.evaluatorName)
        : isExcludedEvaluator(evaluator.evaluatorName, excludeEvaluators);
      if (!skip) {
        const weight = weightOf(evaluator);
        weightedSum += evaluator.mean * weight;
        totalCount += weight;
      }
    }
  }

  return totalCount === 0 ? undefined : weightedSum / totalCount;
};

const buildCell = (
  mean: number | undefined,
  column: MatrixColumnConfig,
  config: MatrixConfig,
  {
    selfJudged = false,
    excludedSelfJudged = 0,
    excludedNonEis = 0,
    erroredOutEvaluators = [],
  }: {
    selfJudged?: boolean;
    excludedSelfJudged?: number;
    excludedNonEis?: number;
    erroredOutEvaluators?: string[];
  } = {}
): MatrixCell => {
  // Checked before the `mean === undefined` branch: a cell-relevant evaluator that errored on
  // every example produces no numeric score at all, so `mean` is undefined even though the run
  // completed. That is a broken-evaluator outage, not ordinary missing data, and must surface
  // as `insufficient-evaluators` rather than silently reading as unmeasured.
  const erroredOut = erroredOutEvaluators.filter(
    (name) =>
      column.evaluators?.includes(name) ?? !isExcludedEvaluator(name, config.excludeEvaluators)
  );
  if (erroredOut.length > 0) {
    return { kind: 'insufficient-evaluators', evaluators: erroredOut };
  }

  if (mean === undefined) {
    if (excludedSelfJudged > 0) {
      return { kind: 'excluded', reason: 'self-judged', docs: excludedSelfJudged };
    }
    // A run whose every score came from a non-EIS judge must not read as "never ran".
    if (excludedNonEis > 0) {
      return { kind: 'excluded', reason: 'non-eis-judge', docs: excludedNonEis };
    }
    return { kind: 'missing' };
  }

  const scale = column.scale ?? config.defaultScale;
  return toCell(roundTo(mean * scale, config.decimals), config, { selfJudged });
};

const CONTRACT_EVALUATORS = new Set([
  'ExpectedToolCalled',
  'FinalAnswerPresent',
  'MinExpectedSteps',
  'SkillInvoked',
]);

const axisCell = (
  modelScores: AggregatedModelScores,
  config: MatrixConfig,
  includeEvaluator: (evaluator: AggregatedEvaluatorScore) => boolean,
  /**
   * Exclusion list for the mean. A closed allowlist predicate (capability axis) passes `[]`:
   * it already rejects every non-contract evaluator, and the prefix-listed default
   * 'Skill Invoked' exclusion would otherwise drop the very contract evaluators the axis
   * exists to average. A negated predicate (judgedQuality) admits raw-magnitude
   * evaluators, so it must keep `config.excludeEvaluators`.
   */
  excludeEvaluators: readonly string[]
): MatrixCell => {
  // Aggregate the raw column means, not their presentation cells: `buildCell` collapses
  // any mean at or below `notRecommendedBelow` into a valueless `not-recommended`, so
  // averaging cells would silently drop sub-threshold columns from the axis instead of
  // letting them drag the average down.
  let weightedSum = 0;
  let totalWeight = 0;
  let hasAnyData = false;
  // The axis predicate is the authoritative filter for this aggregation (see
  // `excludeEvaluators` param doc); compute the mean once and skip unmeasured columns.
  // Error checks run BEFORE the undefined-mean filter: an outage that leaves a column
  // with no numeric mean at all is exactly the case the guard exists for, and filtering
  // first would let another healthy column publish the axis from partial evidence.
  // Only evaluators this axis actually scores from can suppress the axis cell: the errored
  // set is filtered by the same effective selection as `computeColumnMean` (column
  // allowlist OR global exclusion list), so an errored-but-unselected evaluator must not
  // mark the axis insufficient-evaluators.
  const columnEntries = config.columns.map((column) => ({
    column,
    mean: computeColumnMean(modelScores, column, excludeEvaluators, includeEvaluator),
    errored: columnErroredOutEvaluators(modelScores, column).filter(
      (name) =>
        (column.evaluators ? column.evaluators.includes(name) : true) &&
        includeEvaluator({
          evaluatorName: name,
          mean: 0,
          count: 0,
        } as AggregatedEvaluatorScore)
    ),
  }));
  const suppressed = [...new Set(columnEntries.flatMap((entry) => entry.errored))];
  const columnMeans = columnEntries.filter((entry) => entry.mean !== undefined);
  for (const { column, mean } of columnMeans) {
    if (mean === undefined) {
      return { kind: 'missing' };
    }
    hasAnyData = true;
    const scale = column.scale ?? config.defaultScale;
    const weight = config.overall.mode === 'weighted' ? column.weight : 1;
    weightedSum += mean * scale * weight;
    totalWeight += weight;
  }
  if (suppressed.length > 0) {
    return { kind: 'insufficient-evaluators', evaluators: suppressed };
  }
  for (const { column, mean } of columnEntries) {
    if (mean !== undefined) {
      hasAnyData = true;
      const scale = column.scale ?? config.defaultScale;
      const weight = config.overall.mode === 'weighted' ? column.weight : 1;
      weightedSum += mean * scale * weight;
      totalWeight += weight;
    }
  }
  if (!hasAnyData || totalWeight === 0) {
    return { kind: 'missing' };
  }
  return toCell(roundTo(weightedSum / totalWeight, config.decimals), config);
};

/** Weighted mean of computed cells; missing/excluded sources are skipped, "Not recommended" counts as 0 when configured. */
const aggregateCells = (
  sources: Array<{ cell: MatrixCell | undefined; weight: number }>,
  config: MatrixConfig
): MatrixCell => {
  let weightedSum = 0;
  let totalWeight = 0;
  let hasAnyData = false;
  // A self-judged contributor is disclosed on the aggregate: a composite or Overall that hides the
  // flagged base column would otherwise read as an ordinary independently judged score.
  let selfJudged = false;
  // An evaluator outage on any contributing source must propagate: averaging the healthy
  // sources would publish a partial aggregate that looks complete, defeating the outage
  // guard on the base cell.
  let outage: string[] = [];

  for (const { cell, weight } of sources) {
    if (cell && cell.kind !== 'missing' && cell.kind !== 'excluded') {
      hasAnyData = true;

      if (cell.kind === 'insufficient-evaluators') {
        outage = [...outage, ...cell.evaluators];
      } else if (cell.kind === 'not-recommended' || cell.kind === 'insufficient-coverage') {
        if (cell.kind === 'not-recommended') {
          if (cell.selfJudged) {
            selfJudged = true;
          }
          if (config.notRecommendedCountsAsZeroInOverall) {
            totalWeight += weight;
          }
        }
      } else {
        weightedSum += cell.value * weight;
        totalWeight += weight;
        if (cell.selfJudged) {
          selfJudged = true;
        }
      }
    }
  }

  if (outage.length > 0) {
    return { kind: 'insufficient-evaluators', evaluators: outage };
  }
  if (!hasAnyData || totalWeight === 0) {
    return { kind: 'missing' };
  }

  return toCell(roundTo(weightedSum / totalWeight, config.decimals), config, { selfJudged });
};

const computeOverall = (cells: Record<string, MatrixCell>, config: MatrixConfig): MatrixCell =>
  aggregateCells(
    config.columns.map((column) => ({
      cell: cells[column.id],
      weight: config.overall.mode === 'weighted' ? column.weight : 1,
    })),
    config
  );

const computeComposite = (
  cells: Record<string, MatrixCell>,
  composite: MatrixCompositeConfig,
  config: MatrixConfig
): MatrixCell =>
  aggregateCells(
    composite.from.map((refId) => ({ cell: cells[refId], weight: 1 })),
    config
  );

/** Resolves the left-to-right render order of base + composite (+ overall) columns. */
const buildDisplayColumns = (config: MatrixConfig): MatrixDisplayColumn[] => {
  const baseById = new Map(config.columns.map((column) => [column.id, column]));
  const compositeById = new Map(config.composites.map((composite) => [composite.id, composite]));

  const declared: MatrixDisplayColumn[] = config.layout
    ? config.layout.map((id): MatrixDisplayColumn => {
        const base = baseById.get(id);
        if (base) {
          return { id, label: base.label, group: base.group, kind: 'base' };
        }
        const composite = compositeById.get(id);
        if (composite) {
          return { id, label: composite.label, group: composite.group, kind: 'composite' };
        }
        throw new Error(`Matrix config "layout" references unknown column/composite id: "${id}"`);
      })
    : [
        ...config.columns.map(
          (column): MatrixDisplayColumn => ({
            id: column.id,
            label: column.label,
            group: column.group,
            kind: 'base',
          })
        ),
        ...config.composites.map(
          (composite): MatrixDisplayColumn => ({
            id: composite.id,
            label: composite.label,
            group: composite.group,
            kind: 'composite',
          })
        ),
      ];
  // A duplicate layout id would publish the same score twice in CSV/Markdown/HTML;
  // column and composite declarations already reject duplicates, so layout must too.
  const seenLayout = new Set<string>();
  for (const col of declared) {
    if (seenLayout.has(col.id)) {
      throw new Error(`Matrix config "layout" contains duplicate id: "${col.id}"`);
    }
    seenLayout.add(col.id);
  }

  return config.showOverall
    ? [...declared, { id: OVERALL_COLUMN_ID, label: config.overall.label, kind: 'overall' }]
    : declared;
};

/** Aggregates token evaluators for one (model, column) pair in native units, keeping the min/max spread. */
const computeTokenStat = (
  modelScores: AggregatedModelScores,
  column: MatrixColumnConfig,
  evaluatorPrefix: string
): TokenStat | undefined => {
  let weightedSum = 0;
  let totalCount = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const evaluator of columnEvaluators(modelScores, column)) {
    if (evaluator.evaluatorName.startsWith(evaluatorPrefix)) {
      const weight = weightOf(evaluator);
      weightedSum += evaluator.mean * weight;
      totalCount += weight;
      // Stats payloads may omit the per-experiment extremes; the mean is the only bound then.
      min = Math.min(min, evaluator.min ?? evaluator.mean);
      max = Math.max(max, evaluator.max ?? evaluator.mean);
    }
  }

  if (totalCount === 0) {
    return undefined;
  }

  return { mean: weightedSum / totalCount, min, max, count: totalCount };
};

const buildTokenCost = (
  config: MatrixConfig,
  tokenConfig: MatrixTokenCostConfig,
  resolveScores: (modelConfig: MatrixModelConfig) => AggregatedModelScores | undefined
): { models: TokenCostModel[] } => {
  const columnIds = tokenConfig.columns;
  const tokenColumns = columnIds
    ? config.columns.filter((column) => columnIds.includes(column.id))
    : config.columns;

  const models: TokenCostModel[] = [];

  for (const modelConfig of config.models) {
    const modelScores = resolveScores(modelConfig);
    if (modelScores) {
      const cells: TokenCostCell[] = [];
      for (const column of tokenColumns) {
        const inputTokens = computeTokenStat(modelScores, column, tokenConfig.inputEvaluator);
        const outputTokens = computeTokenStat(modelScores, column, tokenConfig.outputEvaluator);
        if (inputTokens || outputTokens) {
          cells.push({
            columnId: column.id,
            inputTokens,
            outputTokens,
            totalMean: (inputTokens?.mean ?? 0) + (outputTokens?.mean ?? 0),
          });
        }
      }

      if (cells.length > 0) {
        models.push({
          modelId: modelConfig.id,
          modelLabel: modelConfig.label,
          openSource: modelConfig.openSource,
          cells,
        });
      }
    }
  }

  return { models };
};

/**
 * Groups rows into tiers: a new tier starts once the drop from the tier leader exceeds
 * the combined 95% interval. `rankValue` must be the same metric the rows are sorted by
 * (composite `sortValue` when composites exist, else legacy `overall`) — otherwise a
 * row's tier and its rank position can disagree.
 */
const assignTiers = (
  rows: MatrixRow[],
  config: MatrixConfig,
  rankValue: (row: MatrixRow) => number
): MatrixRow[] => {
  const sd = config.overall.runStdev;
  if (!sd) {
    return rows;
  }
  const threshold = 2 * 1.96 * sd;
  let tier = 1;
  let leader: number | undefined;
  return rows.map((row) => {
    const value = rankValue(row);
    if (value < 0) {
      return row;
    }
    if (leader === undefined) {
      leader = value;
    } else if (leader - value > threshold) {
      tier += 1;
      leader = value;
    }
    return { ...row, tier };
  });
};

/** Distinct commits behind one model's scores, newest experiment first. */
export const rowCommitShas = (
  modelScores: AggregatedModelScores | undefined
): string[] | undefined => {
  if (!modelScores) {
    return undefined;
  }
  const ordered = [...modelScores.suites].sort((a, b) =>
    String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? ''))
  );
  const shas = ordered.map((suite) => suite.commitSha).filter((sha): sha is string => !!sha);
  const unique = [...new Set(shas)];
  return unique.length ? unique : undefined;
};

const buildMatrixRow = (
  modelConfig: MatrixModelConfig,
  modelScores: AggregatedModelScores,
  config: MatrixConfig,
  excludeEvaluators: readonly string[],
  overallExcludeEvaluators: readonly string[]
): MatrixRow => {
  const cells: Record<string, MatrixCell> = {};
  // Base-column cells use config.excludeEvaluators only; the saturation-aware
  // list feeds a separate Overall-only cell set below.
  const overallCells: Record<string, MatrixCell> = {};
  for (const column of config.columns) {
    const columnSuites = new Set(column.suites);
    // Per-prefix judge-policy rejections land on the synthetic `prefix:<p>` dataset itself,
    // so a column whose own prefix lost every score reads `excluded:*` even when a sibling
    // column fed by the same suite kept admissible scores (suite-level counts would be 0).
    const columnDatasetIds = column.examplePrefixes
      ? new Set(column.examplePrefixes.map((prefix) => `prefix:${prefix}`))
      : column.datasetIds
      ? new Set(column.datasetIds)
      : undefined;
    const columnSuitesAll = modelScores.suites.filter((suite) => columnSuites.has(suite.suiteId));
    const perDataset = (pick: (dataset: AggregatedSuiteScores['datasets'][number]) => number) =>
      columnSuitesAll.reduce(
        (total, suite) =>
          total +
          suite.datasets
            .filter((dataset) => !columnDatasetIds || columnDatasetIds.has(dataset.datasetId))
            .reduce((sum, dataset) => sum + (pick(dataset) || 0), 0),
        0
      );
    const cellExtras = {
      // Per-column, not suite-wide: only the datasets this column actually reads decide
      // whether the published cell is self-judged (a suite mixing self-judged `alert`
      // and independently judged `hunt` prefixes must not label `hunt` self-judged).
      selfJudged: columnDatasetIds
        ? columnSuitesAll.some((suite) =>
            suite.datasets.some(
              (dataset) => columnDatasetIds.has(dataset.datasetId) && dataset.selfJudged === true
            )
          )
        : columnSuitesAll.some((suite) => suite.selfJudged === true),
      // Prefix columns read ONLY their own datasets' exclusion counts: the suite-wide
      // total belongs to the suite as a whole, and applying it via Math.max would
      // publish a genuinely missing sibling prefix (`hunt` never ran) as
      // `excluded:non-eis-judge` just because `alert` was fully rejected.
      excludedSelfJudged: columnDatasetIds
        ? perDataset((dataset) => dataset.excludedSelfJudged ?? 0)
        : columnSuitesAll.reduce((total, suite) => total + (suite.excludedSelfJudged ?? 0), 0),
      excludedNonEis: columnDatasetIds
        ? perDataset((dataset) => dataset.excludedNonEis ?? 0)
        : columnSuitesAll.reduce((total, suite) => total + (suite.excludedNonEis ?? 0), 0),
      erroredOutEvaluators: columnErroredOutEvaluators(modelScores, column),
    };
    cells[column.id] = buildCell(
      computeColumnMean(modelScores, column, excludeEvaluators),
      column,
      config,
      cellExtras
    );
    if (overallExcludeEvaluators !== excludeEvaluators) {
      overallCells[column.id] = buildCell(
        computeColumnMean(modelScores, column, overallExcludeEvaluators),
        column,
        config,
        cellExtras
      );
    }
  }

  // Declared order, so a later composite can reference an earlier one.
  for (const composite of config.composites) {
    cells[composite.id] = computeComposite(cells, composite, config);
  }

  const scoredColumns = config.columns.filter((c) => {
    const kind = cells[c.id].kind;
    return kind === 'score' || kind === 'not-recommended';
  }).length;

  // `minCoverage` gates every aggregate built from the base columns, not just the
  // legacy Overall column — otherwise a composite (which ranking prefers over Overall
  // once composites are configured) can rank a row that Overall itself would have
  // excluded for insufficient coverage.
  if (config.minCoverage > 0 && scoredColumns < config.minCoverage) {
    for (const composite of config.composites) {
      cells[composite.id] = {
        kind: 'insufficient-coverage',
        covered: scoredColumns,
        required: config.minCoverage,
      };
    }
  }

  // When saturation exclusions are active, Overall aggregates its own cell values
  // computed without the saturated evaluators; base cells above are untouched.
  const overallSourceCells = Object.keys(overallCells).length > 0 ? overallCells : cells;
  const overall = computeOverall(overallSourceCells, config);

  return {
    modelId: modelConfig.id,
    modelLabel: modelConfig.label,
    openSource: modelConfig.openSource,
    cells,
    overall:
      config.minCoverage > 0 && scoredColumns < config.minCoverage
        ? { kind: 'insufficient-coverage', covered: scoredColumns, required: config.minCoverage }
        : overall,
    capability: axisCell(
      modelScores,
      config,
      (evaluator) =>
        CONTRACT_EVALUATORS.has(
          evaluator.evaluatorName.replace(/^Skill Invoked \([^)]+\)$/, 'SkillInvoked')
        ),
      // Allowlist predicate: no exclusion list, so the default 'Skill Invoked' prefix
      // exclusion cannot drop the contract evaluators this axis averages.
      []
    ),
    judgedQuality: axisCell(
      modelScores,
      config,
      (evaluator) =>
        !CONTRACT_EVALUATORS.has(
          evaluator.evaluatorName.replace(/^Skill Invoked \([^)]+\)$/, 'SkillInvoked')
        ),
      // Negated predicate: keep the raw-magnitude exclusion list, or Latency/token
      // evaluators would enter the judged mean on the 0-10 scale.
      config.excludeEvaluators
    ),
    coverage: {
      covered: scoredColumns,
      total: config.columns.length,
    },
    commitShas: rowCommitShas(modelScores),
  };
};

/** Pure transform from aggregated eval scores + config into a renderable matrix. */
export const buildMatrix = (
  aggregated: AggregatedModelScores[],
  config: MatrixConfig,
  log?: { warning: (message: string) => void }
): Matrix => {
  // A configured row can match several aggregated identities (its own id plus every `matchIds`
  // alias). Suites are queried per identity, so an alias may hold suites the primary id does not --
  // picking one identity with `get() ?? find()` silently dropped the rest. Merge them per suite.
  const newestSuiteByTimestamp = (list: AggregatedSuiteScores[]): AggregatedSuiteScores =>
    list.reduce((best, current) =>
      (current.timestamp ?? '') > (best.timestamp ?? '') ? current : best
    );
  const matchedSuites = (matches: AggregatedModelScores[]): AggregatedSuiteScores[] => {
    const bySuiteId = new Map<string, AggregatedSuiteScores[]>();
    for (const match of matches) {
      for (const suite of match.suites) {
        const list = bySuiteId.get(suite.suiteId) ?? [];
        list.push(suite);
        bySuiteId.set(suite.suiteId, list);
      }
    }
    return [...bySuiteId.values()].map((list) =>
      list.length === 1 ? list[0] : newestSuiteByTimestamp(list)
    );
  };
  const sumExcludedCounts = (matches: AggregatedModelScores[]): ExcludedScoreCounts | undefined => {
    const present = matches
      .map((match) => match.excluded)
      .filter((counts): counts is ExcludedScoreCounts => counts !== undefined);
    if (present.length === 0) {
      return undefined;
    }
    const total: ExcludedScoreCounts = {
      nonQuality: 0,
      nonEis: 0,
      selfJudged: 0,
      unmappedVerdict: 0,
    };
    for (const counts of present) {
      total.nonQuality += counts.nonQuality;
      total.nonEis += counts.nonEis;
      total.selfJudged += counts.selfJudged;
      total.unmappedVerdict += counts.unmappedVerdict;
    }
    return total;
  };
  const mergeMatchedScores = (
    modelId: string,
    matches: AggregatedModelScores[]
  ): AggregatedModelScores => {
    const family = matches.find((match) => match.family !== undefined)?.family;
    const provider = matches.find((match) => match.provider !== undefined)?.provider;
    const excluded = sumExcludedCounts(matches);
    return {
      modelId,
      ...(family !== undefined ? { family } : {}),
      ...(provider !== undefined ? { provider } : {}),
      suites: matchedSuites(matches),
      ...(excluded !== undefined ? { excluded } : {}),
    };
  };

  const resolveScores = (modelConfig: MatrixModelConfig): AggregatedModelScores | undefined => {
    const matches = aggregated.filter((entry) => matchesModel(modelConfig, entry.modelId));
    if (matches.length === 0) {
      return undefined;
    }
    return matches.length === 1 ? matches[0] : mergeMatchedScores(modelConfig.id, matches);
  };

  // Saturation must be judged on the data that actually feeds the matrix rows: the resolved
  // logical-model rows (primary + matchIds merged, newest suite run selected), not the raw
  // query result, which still contains separate alias identities and every dataset each
  // suite returned. An unselected dataset or duplicate alias could otherwise mark an
  // evaluator saturated and drop it from Overall even though it discriminates on the
  // configured columns.
  const resolvedForSaturation = config.models
    .map((modelConfig) => resolveScores(modelConfig))
    .filter((entry): entry is AggregatedModelScores => entry !== undefined);
  const saturation = config.overall.excludeSaturatedEvaluators
    ? detectSaturatedEvaluators(resolvedForSaturation)
    : [];
  const saturatedNames = saturatedEvaluatorNames(saturation);
  const excludeEvaluators = config.excludeEvaluators;
  // Saturation exclusions feed the Overall aggregate only, never base-column cells.
  const overallExcludeEvaluators =
    saturatedNames.size > 0
      ? [...config.excludeEvaluators, ...saturatedNames]
      : config.excludeEvaluators;

  const proprietary: MatrixRow[] = [];
  const openSource: MatrixRow[] = [];

  for (const modelConfig of config.models) {
    const modelScores = resolveScores(modelConfig);
    if (modelScores) {
      const row = buildMatrixRow(
        modelConfig,
        modelScores,
        config,
        excludeEvaluators,
        overallExcludeEvaluators
      );
      (modelConfig.openSource ? openSource : proprietary).push(row);
    }
  }

  // Rank by the final composite (e.g. Overall Score) when composites exist,
  // otherwise by the legacy Overall column.
  const primaryId =
    config.composites.length > 0
      ? config.composites[config.composites.length - 1].id
      : OVERALL_COLUMN_ID;

  const sortValue = (row: MatrixRow): number => {
    const cell = primaryId === OVERALL_COLUMN_ID ? row.overall : row.cells[primaryId];
    return cell && cell.kind === 'score' ? cell.value : -1;
  };

  const sortByPrimaryDesc = (a: MatrixRow, b: MatrixRow): number => sortValue(b) - sortValue(a);

  const allRows = [...proprietary, ...openSource];
  if (log && allRows.length > 0) {
    const measuredKinds = (cell: MatrixCell | undefined): boolean =>
      cell?.kind === 'score' || cell?.kind === 'not-recommended';
    for (const column of config.columns) {
      const scored = allRows.filter((row) => measuredKinds(row.cells[column.id])).length;
      if (scored > 0 && scored < allRows.length / 2) {
        log.warning(
          `Column "${column.label}" has scores for only ${scored} of ${allRows.length} models -- too sparse to rank, and the models that did run it are averaged over a different column set than the rest. Check whether the suite is scheduled in the weekly pipeline before reading these cells as model differences.`
        );
      }
    }

    const shaByRow = allRows
      .map((row) => ({ label: row.modelLabel, shas: row.commitShas ?? [] }))
      .filter((entry) => entry.shas.length > 0);
    const distinctShas = new Set(shaByRow.flatMap((entry) => entry.shas));
    if (distinctShas.size > 1) {
      const sample = shaByRow
        .slice(0, 6)
        .map((entry) => `${entry.label}=${entry.shas.map((sha) => sha.slice(0, 12)).join('+')}`)
        .join(', ');
      log.warning(
        `Matrix spans ${distinctShas.size} commits across ${
          shaByRow.length
        } scored rows -- rows were graded against different codebases and are only loosely comparable. ${sample}${
          shaByRow.length > 6 ? ', ...' : ''
        }`
      );
    }

    const scoredCells = allRows.reduce(
      (sum, row) =>
        sum + config.columns.filter((column) => measuredKinds(row.cells[column.id])).length,
      0
    );
    if (scoredCells === 0) {
      log.warning(
        `No column produced a single scored cell across ${allRows.length} models. The per-prefix score fetch returned nothing usable -- do NOT publish this run. Check that the scores route still returns the fields the verdict ladder reads before blaming the models.`
      );
    }
  }

  return {
    columns: config.columns.map((column) => ({
      id: column.id,
      label: column.label,
      group: column.group,
    })),
    composites: config.composites.map((composite) => ({
      id: composite.id,
      label: composite.label,
      group: composite.group,
    })),
    displayColumns: buildDisplayColumns(config),
    overallLabel: config.overall.label,
    evaluatorSaturation: saturation,
    proprietary: assignTiers(proprietary.sort(sortByPrimaryDesc), config, sortValue),
    openSource: assignTiers(openSource.sort(sortByPrimaryDesc), config, sortValue),
    ...(config.tokenCost
      ? { tokenCost: buildTokenCost(config, config.tokenCost, resolveScores) }
      : {}),
  };
};
