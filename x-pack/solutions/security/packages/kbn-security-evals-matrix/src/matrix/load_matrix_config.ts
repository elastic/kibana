/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { schema, type TypeOf } from '@kbn/config-schema';

const MAX_STRING_LENGTH = 1024;
const MAX_ARRAY_SIZE = 1000;

/** Colons are rejected because trace keys are a plain `${modelId}:${columnId}` join. */
const idSchema = schema.string({
  minLength: 1,
  maxLength: MAX_STRING_LENGTH,
  validate: (value) => (value.includes(':') ? `must not contain ':' (got "${value}")` : undefined),
});

const columnSchema = schema.object({
  /** Stable identifier for the column (used as the CSV/JSON key). */
  id: idSchema,
  /** Human-facing column header (e.g. "Alert Triage"). */
  label: schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
  /** Optional grouped-header label; columns sharing a `group` render under one spanning header. */
  group: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH })),
  /** `suite.id` values whose scores contribute to this column. */
  suites: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
    minSize: 1,
    maxSize: MAX_ARRAY_SIZE,
  }),
  /** Optional restriction to specific `example.dataset.id` values. */
  datasetIds: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
      maxSize: MAX_ARRAY_SIZE,
    })
  ),
  /**
   * Optional restriction to `example.id` prefixes, splitting one dataset into
   * per-category columns (e.g. ['alert-analysis'] matches `alert-analysis-a`).
   */
  examplePrefixes: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
      minSize: 1,
      maxSize: MAX_ARRAY_SIZE,
    })
  ),
  /** Optional restriction to specific `evaluator.name` values. */
  evaluators: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
      maxSize: MAX_ARRAY_SIZE,
    })
  ),
  /** Multiplier applied to the mean evaluator score; defaults to `defaultScale`. */
  scale: schema.maybe(schema.number({ min: 0 })),
  /** Git branch(es) this column's experiments are read from, overriding the top-level `branch`; arrays are unioned. */
  branch: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
      schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
        minSize: 1,
        maxSize: MAX_ARRAY_SIZE,
      }),
    ])
  ),
  /** Opt this column's suites out of the global `scoring.excludeSelfJudged`. */
  allowSelfJudged: schema.maybe(schema.boolean()),
  /** Relative weight of this column in the legacy Overall score. Defaults to 1. */
  weight: schema.number({ defaultValue: 1, min: 0 }),
});

/** A derived column whose cell is the equal-weighted mean of base columns or earlier composites. */
const compositeSchema = schema.object({
  /** Stable identifier for the composite (used as the CSV/JSON key). */
  id: idSchema,
  /** Human-facing column header (e.g. "Agent Builder Score"). */
  label: schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
  /** Optional grouped-header label (see `columnSchema.group`). */
  group: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH })),
  /** Column/composite ids whose cells are averaged into this composite. */
  from: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
    minSize: 1,
    maxSize: MAX_ARRAY_SIZE,
  }),
});

const modelSchema = schema.object({
  /** Primary `task.model.id` value to match against. */
  id: idSchema,
  /** Display name shown in the published matrix (e.g. "Claude Sonnet 4"). */
  label: schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }),
  /** Additional `task.model.id` values that should map to the same row. Validated by the same
   * no-colon rule as `id`: aliases become the model portion of `${modelId}:${columnId}` trace
   * keys, so a colon-bearing alias could collide with an unrelated model's trace keys. */
  matchIds: schema.maybe(
    schema.arrayOf(idSchema, {
      maxSize: MAX_ARRAY_SIZE,
    })
  ),
  /** Renders the model under the "Open-source models" table when true. */
  openSource: schema.boolean({ defaultValue: false }),
});

/**
 * Observability-tier evaluators (raw magnitudes, not 0-1 scores) excluded from
 * column aggregation by default; matched by name prefix.
 */
export const DEFAULT_EXCLUDED_EVALUATORS: readonly string[] = [
  'Latency',
  'Tool Calls',
  'Input Tokens',
  'Output Tokens',
  'Cached Tokens',
  'Skill Invoked',
];

export const matrixConfigSchema = schema.object({
  /** Page/table title (informational; used in the markdown artifact). */
  title: schema.string({ defaultValue: 'LLM performance matrix', maxLength: MAX_STRING_LENGTH }),
  /** Default git branch to pull experiments from (CLI `--branch` overrides). */
  branch: schema.string({ defaultValue: 'main', maxLength: MAX_STRING_LENGTH }),
  /** Only consider experiments newer than `now-<lookbackDays>d`. */
  lookbackDays: schema.number({ defaultValue: 45, min: 1 }),
  /** Opt-in scoring policy for judged (LLM-graded) evaluators. */
  scoring: schema.maybe(
    schema.object({
      /** Score judged evaluators by their categorical verdict rather than the continuous score. */
      useVerdictLadder: schema.boolean({ defaultValue: false }),
      /** Drop scores produced by judges that are not EIS-pinned (not reproducible). */
      requireEisJudge: schema.boolean({ defaultValue: false }),
      /** Drop scores where a model graded its own output. */
      excludeSelfJudged: schema.boolean({ defaultValue: false }),
    })
  ),
  /** Default multiplier applied to evaluator means when a column omits `scale`. */
  defaultScale: schema.number({ defaultValue: 10, min: 0 }),
  /** Decimal places used when rounding cell values. */
  decimals: schema.number({ defaultValue: 2, min: 0, max: 6 }),
  /** Cells at/under this value (after scaling) render as `notRecommendedLabel`. */
  notRecommendedBelow: schema.number({ defaultValue: 0, min: 0 }),
  /** Tool-call count above which a cell is logged as a possible runaway loop (warning only); 0 disables. */
  toolCallWarnAbove: schema.number({ defaultValue: 0, min: 0 }),
  /** Minimum scored columns before `Overall` is published; below it the row ranks last as `insufficient-coverage`. */
  minCoverage: schema.number({ defaultValue: 0, min: 0 }),
  /** Text rendered when a model fails / lacks data for a column. */
  notRecommendedLabel: schema.string({
    defaultValue: 'Not recommended',
    maxLength: MAX_STRING_LENGTH,
  }),
  /** When true, "Not recommended" cells count as 0 in Overall and composite columns. */
  notRecommendedCountsAsZeroInOverall: schema.boolean({ defaultValue: true }),
  /** `evaluator.name` prefixes excluded from every column's aggregation; `[]` includes everything. */
  excludeEvaluators: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
    defaultValue: [...DEFAULT_EXCLUDED_EVALUATORS],
    maxSize: MAX_ARRAY_SIZE,
  }),
  overall: schema.object({
    label: schema.string({ defaultValue: 'Overall', maxLength: MAX_STRING_LENGTH }),
    mode: schema.oneOf([schema.literal('weighted'), schema.literal('mean')], {
      defaultValue: 'weighted',
    }),
    /** Run-to-run stdev of the overall score; rows within 2x the 95% interval are grouped into a tie tier. */
    runStdev: schema.maybe(schema.number({ min: 0, max: 10 })),
    /** Drop saturated evaluators (see `evaluator_saturation.ts`) from the Overall aggregate. */
    excludeSaturatedEvaluators: schema.boolean({ defaultValue: false }),
  }),
  /** Renders the legacy trailing "Overall" column over every base column. */
  showOverall: schema.boolean({ defaultValue: true }),
  columns: schema.arrayOf(columnSchema, { minSize: 1, maxSize: MAX_ARRAY_SIZE }),
  /** Derived columns averaged from base columns / earlier composites. */
  composites: schema.arrayOf(compositeSchema, { defaultValue: [], maxSize: MAX_ARRAY_SIZE }),
  /** Explicit display order of base + composite column ids; defaults to base columns then composites. */
  layout: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
      maxSize: MAX_ARRAY_SIZE,
    })
  ),
  models: schema.arrayOf(modelSchema, { minSize: 1, maxSize: MAX_ARRAY_SIZE }),
  /** Opt-in token/cost axis aggregated per (model, column) into `matrix.tokenCost` in native units. */
  tokenCost: schema.maybe(
    schema.object({
      /** Evaluator name (prefix-matched) contributing input-token magnitudes. */
      inputEvaluator: schema.string({
        defaultValue: 'Input Tokens',
        maxLength: MAX_STRING_LENGTH,
      }),
      /** Evaluator name (prefix-matched) contributing output-token magnitudes. */
      outputEvaluator: schema.string({
        defaultValue: 'Output Tokens',
        maxLength: MAX_STRING_LENGTH,
      }),
      /** Column ids the token axis is aggregated over; defaults to every base column. */
      columns: schema.maybe(
        schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_STRING_LENGTH }), {
          maxSize: MAX_ARRAY_SIZE,
        })
      ),
    })
  ),
  /** Opt-in provenance extras (fixture fingerprint, methodology notes) rendered into the HTML footer. */
  provenance: schema.maybe(
    schema.object({
      fixtureFingerprint: schema.maybe(schema.string({ maxLength: MAX_STRING_LENGTH })),
      methodologyNotes: schema.maybe(
        schema.arrayOf(schema.string({ minLength: 1, maxLength: 2000 }), { maxSize: 20 })
      ),
    })
  ),
});

export type MatrixConfig = TypeOf<typeof matrixConfigSchema>;
export type MatrixTokenCostConfig = NonNullable<MatrixConfig['tokenCost']>;
export type MatrixColumnConfig = TypeOf<typeof columnSchema>;
export type MatrixCompositeConfig = TypeOf<typeof compositeSchema>;
export type MatrixModelConfig = TypeOf<typeof modelSchema>;

export const parseMatrixConfig = (raw: unknown): MatrixConfig => {
  const config = matrixConfigSchema.validate(raw);
  assertNoDuplicateIds(config);
  assertScoringNeedsExamplePrefixes(config);
  return config;
};

/**
 * Column/composite ids share one namespace: both key `MatrixRow.cells` and are looked up
 * by id when rendering. A duplicate silently overwrites the earlier cell while the id
 * still appears twice in `config.columns`/`config.composites`, double-counting it toward
 * coverage and the Overall aggregate. Model identity collides the same way: `matchesModel`
 * (see `build_matrix.ts`) accepts either a row's primary `id` or any of its `matchIds`, so
 * an id reused as another row's alias (or an alias shared by two rows) resolves the same
 * scored model into multiple published rows. Composite `from` references are validated here
 * too: an unknown ref is silently dropped by `aggregateCells`, so a typo or forward reference
 * would otherwise publish a plausible-looking score computed from only the valid subset.
 * Reject all of these after schema validation, where the well-typed arrays are cheap to walk.
 */
const assertNoDuplicateIds = (config: MatrixConfig): void => {
  const columnIds = new Set<string>();
  for (const column of config.columns) {
    if (columnIds.has(column.id)) {
      throw new Error(`Duplicate column id "${column.id}".`);
    }
    columnIds.add(column.id);
  }

  const compositeIds = new Set<string>();
  for (const composite of config.composites) {
    if (compositeIds.has(composite.id)) {
      throw new Error(`Duplicate composite id "${composite.id}".`);
    }
    if (columnIds.has(composite.id)) {
      throw new Error(`Composite id "${composite.id}" collides with a base column id.`);
    }
    compositeIds.add(composite.id);
  }

  // Composites may reference base columns or earlier composites, but not themselves or
  // later composites (computeComposite reads `cells`, which is only populated for base
  // columns and composites resolved earlier in `config.composites` order).
  const resolvableByThisPoint = new Set<string>(columnIds);
  for (const composite of config.composites) {
    for (const refId of composite.from) {
      if (!resolvableByThisPoint.has(refId)) {
        throw new Error(
          `Composite "${composite.id}" references unknown or not-yet-defined source "${refId}" ` +
            `in "from". Composite sources must be base column ids or ids of composites declared earlier.`
        );
      }
    }
    resolvableByThisPoint.add(composite.id);
  }

  // Model identity spans both `id` and `matchIds` (see `matchesModel` in build_matrix.ts):
  // any id/alias reused across rows would silently merge two rows' scores into one.
  const modelIdentifierOwners = new Map<string, string>();
  for (const model of config.models) {
    for (const identifier of [model.id, ...(model.matchIds ?? [])]) {
      const owner = modelIdentifierOwners.get(identifier);
      if (owner !== undefined) {
        throw new Error(
          owner === model.id
            ? `Duplicate model id "${identifier}".`
            : `Model identifier "${identifier}" is used by more than one model row ` +
              `(as id or matchIds); each model id/alias must resolve to exactly one row.`
        );
      }
      modelIdentifierOwners.set(identifier, model.id);
    }
  }
};

/**
 * `requireEisJudge`/`useVerdictLadder` only take effect on the raw per-document score path
 * (`scoresByPrefixToDatasets`, gated on `examplePrefixes`) — the pre-aggregated stats path
 * (`getExperimentStats`) has no judge-name/verdict-label data to filter or remap. Unlike
 * `excludeSelfJudged`, which is separately enforced pre-aggregation in
 * `pickLatestExperimentPerModel` (see `queryMatrixScores`), a suite that enables either of
 * these two fields but has no column declaring `examplePrefixes` for that suite would silently
 * score unfiltered/unmapped raw means while claiming the policy is applied. Fail at load time
 * instead of publishing numbers the policy never touched.
 */
const assertScoringNeedsExamplePrefixes = (config: MatrixConfig): void => {
  const policyEnabled =
    Boolean(config.scoring?.requireEisJudge) || Boolean(config.scoring?.useVerdictLadder);
  if (!policyEnabled) {
    return;
  }

  const suitesWithPrefixes = new Set<string>();
  const allSuites = new Set<string>();
  for (const column of config.columns) {
    for (const suiteId of column.suites) {
      allSuites.add(suiteId);
      if (column.examplePrefixes && column.examplePrefixes.length > 0) {
        suitesWithPrefixes.add(suiteId);
      }
    }
  }

  const unsatisfied = [...allSuites].filter((suiteId) => !suitesWithPrefixes.has(suiteId));
  if (unsatisfied.length > 0) {
    throw new Error(
      `Global \`scoring\` enables requireEisJudge/useVerdictLadder, but suite(s) ` +
        `${unsatisfied.map((id) => `"${id}"`).join(', ')} have no column declaring ` +
        `"examplePrefixes". These two policy fields only take effect on the per-document score ` +
        `path, which requires examplePrefixes; without it the suite silently falls back to ` +
        `unfiltered/unmapped pre-aggregated stats.`
    );
  }
};

/** Parses a `--model` CLI value of the form `id[:label][:open-source]`. */
export const parseModelOverride = (raw: string): MatrixModelConfig => {
  const segments = raw.split(':').map((segment) => segment.trim());
  const [id, label, openSourceFlag] = segments;

  if (!id) {
    throw new Error(
      `Invalid --model value "${raw}": model id is required (format: id[:label][:open-source]).`
    );
  }
  if (segments.length > 3) {
    throw new Error(
      `Invalid --model value "${raw}": expected at most 3 colon-separated segments (id[:label][:open-source]).`
    );
  }
  if (openSourceFlag !== undefined && openSourceFlag !== 'open-source') {
    throw new Error(
      `Invalid --model value "${raw}": third segment must be the literal "open-source", got "${openSourceFlag}".`
    );
  }

  return { id, label: label || id, openSource: openSourceFlag === 'open-source' };
};

/** Returns a copy of the config with its model set replaced by `--model` overrides. */
export const applyModelOverrides = (
  config: MatrixConfig,
  rawModels: readonly string[]
): MatrixConfig => {
  if (rawModels.length === 0) {
    return config;
  }

  const models = rawModels.map(parseModelOverride);
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.id)) {
      throw new Error(`Duplicate --model id "${model.id}".`);
    }
    seen.add(model.id);
  }

  return { ...config, models };
};

export const loadMatrixConfig = (configPath: string): MatrixConfig => {
  if (!Fs.existsSync(configPath)) {
    throw new Error(`Matrix config not found at: ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    throw new Error(
      `Failed to parse matrix config at ${configPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return parseMatrixConfig(parsed);
};
