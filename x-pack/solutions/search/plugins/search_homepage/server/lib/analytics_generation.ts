/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { ToolSchema } from '@kbn/inference-common';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import type { SerializableRecord } from '@kbn/utility-types';
import type {
  AnalyticsGeneratedPanel,
  AnalyticsGenerationCounts,
  AnalyticsSourceGeneration,
  AnalyticsStarterQuery,
  AnalyticsUseCaseId,
} from '../../common/analytics';
import {
  MAX_GENERATED_PANELS,
  MAX_GENERATED_QUERIES,
  MIN_GENERATED_PANELS,
  MIN_GENERATED_QUERIES,
} from '../../common/analytics';
import {
  TIME_BUCKETS_AS_LABELS,
  TIME_BUCKET_COLUMN,
  layOutDashboardGrids,
} from '../../common/analytics_dashboard_layout';
import { toGeneratedPanelConfig } from '../../common/analytics_generated_dashboard';
import { quoteEsqlColumn } from '../../common/esql_identifiers';
import { checkGeneratedEsql } from './analytics_generation_esql';
import type { SourceProfile } from './analytics_generation_profile';
import { getRecentEventsFilter } from './analytics_generation_profile';
import type {
  GenerationPrompt,
  ProposedPanel,
  ProposedQuestion,
  RejectedItem,
} from './analytics_generation_prompt';
import {
  GENERATION_TOOL_SCHEMA,
  REPAIR_TOOL_SCHEMA,
  buildGenerationPrompt,
  buildRepairPrompt,
  generationOutputSchema,
  repairOutputSchema,
} from './analytics_generation_prompt';

const MAX_METRIC_PANELS = 3;
const MAX_ERROR_LENGTH = 400;
/** How many validation queries run against the source at once. */
const VALIDATION_CONCURRENCY = 4;
const QUESTION_ROW_LIMIT = 20;
const PANEL_ROW_LIMIT = 50;
const NUMERIC_COLUMN_TYPES: readonly string[] = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
  'counter_long',
  'counter_integer',
  'counter_double',
];

export interface EsqlRunRequest {
  query: string;
  filter?: QueryDslQueryContainer;
  params?: Array<Record<string, string>>;
}

export interface EsqlRunResult {
  columns: ReadonlyArray<{ name: string; type: string }>;
  rowCount: number;
}

/** Runs a query against the source as the caller; rejects with what Elasticsearch said. */
export type EsqlRunner = (request: EsqlRunRequest) => Promise<EsqlRunResult>;

export interface ModelRequest extends GenerationPrompt {
  id: 'analytics_source_generation' | 'analytics_source_generation_repair';
  schema: ToolSchema;
}

/** Asks the model for one structured answer; the answer is untrusted until parsed. */
export type GenerationModel = (request: ModelRequest) => Promise<SerializableRecord>;

/** The model answered with something other than the structure it was asked for. */
export class GenerationOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationOutputError';
  }
}

type Checked<TItem> = { ok: true; item: TItem } | { ok: false; error: string };

type ValidPanel = Omit<AnalyticsGeneratedPanel, 'grid'>;

interface ValidationContext {
  profile: SourceProfile;
  run: EsqlRunner;
  /** Epoch milliseconds the dashboard time range ends at. */
  now: number;
}

const RECENT_EVENTS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Why a query that runs is still wrong on this source, when that can be told without a model:
 * amounts in several currencies added up or averaged as if they were one.
 */
export const findMixedCurrencyError = (
  esql: string,
  { roles, values }: SourceProfile
): string | undefined => {
  const currency = roles?.dimensions.find(({ kind }) => kind === 'currency');
  if (currency === undefined) {
    return undefined;
  }
  const currencies = values?.topValues.find(({ field }) => field === currency.name);
  if (currencies !== undefined && currencies.distinctValues < 2) {
    return undefined;
  }
  const mixedAmount = roles?.measures
    .filter(({ kind }) => kind === 'money')
    .find(({ name }) =>
      new RegExp(`\\b(SUM|AVG|MEDIAN|PERCENTILE)\\(\\s*\`?${escapeRegExp(name)}\\b`, 'i').test(esql)
    );

  return mixedAmount !== undefined && !esql.includes(currency.name)
    ? `${mixedAmount.name} holds amounts in different currencies (${currency.name}): group by ${currency.name} or filter to one currency.`
    : undefined;
};

const toErrorText = (error: Error): string =>
  error.message.replace(/\s+/g, ' ').slice(0, MAX_ERROR_LENGTH);

const runChecked = async (
  run: EsqlRunner,
  request: EsqlRunRequest
): Promise<Checked<EsqlRunResult>> => {
  try {
    return { ok: true, item: await run(request) };
  } catch (error) {
    return { ok: false, error: toErrorText(error) };
  }
};

/** Runs a question's query over the period Discover opens on and expects rows back. */
export const validateQuestion = async (
  { question, esql }: ProposedQuestion,
  { profile, run }: ValidationContext
): Promise<Checked<ProposedQuestion>> => {
  const { source, timeField, hasRecentEvents } = profile;
  const guard = checkGeneratedEsql(esql, source, { allowTimeRangeParams: false });
  if (!guard.ok) {
    return { ok: false, error: guard.reason };
  }
  const mixedCurrencyError = findMixedCurrencyError(esql, profile);
  if (mixedCurrencyError !== undefined) {
    return { ok: false, error: mixedCurrencyError };
  }

  const result = await runChecked(run, {
    query: `${esql}\n| LIMIT ${QUESTION_ROW_LIMIT}`,
    ...(hasRecentEvents && { filter: getRecentEventsFilter(timeField) }),
  });
  if (!result.ok) {
    return result;
  }
  if (hasRecentEvents && result.item.rowCount === 0) {
    return {
      ok: false,
      error: 'The query ran but returned no rows for the last 7 days. Check the literal values.',
    };
  }
  return { ok: true, item: { question, esql } };
};

/** The query a panel runs: bound to the dashboard time range, time buckets turned into labels. */
const toPanelQuery = (esql: string, fromEnd: number, timeField: string | null, x?: string) => {
  const column = timeField === null ? null : quoteEsqlColumn(timeField);
  const filtered =
    column === null
      ? esql
      : `${esql.slice(
          0,
          fromEnd
        )} | WHERE ${column} >= ?_tstart AND ${column} <= ?_tend${esql.slice(fromEnd)}`;

  return x === TIME_BUCKET_COLUMN ? `${filtered} | ${TIME_BUCKETS_AS_LABELS}` : filtered;
};

/**
 * Runs a panel's query the way the dashboard will and checks that the columns the chart draws
 * exist, that the drawn values are numbers and that Lens accepts the configuration.
 */
export const validatePanel = async (
  { title, chart, esql, x, y, breakdown }: ProposedPanel,
  { profile, run, now }: ValidationContext
): Promise<Checked<ValidPanel>> => {
  const { source, timeField, hasRecentEvents } = profile;
  const guard = checkGeneratedEsql(esql, source, { allowTimeRangeParams: true });
  if (!guard.ok) {
    return { ok: false, error: guard.reason };
  }
  const mixedCurrencyError = findMixedCurrencyError(esql, profile);
  if (mixedCurrencyError !== undefined) {
    return { ok: false, error: mixedCurrencyError };
  }
  if (guard.usesTimeRangeParams && (timeField === null || x !== TIME_BUCKET_COLUMN)) {
    return {
      ok: false,
      error: `?_tstart and ?_tend may only be used in BUCKET for a time series with x "${TIME_BUCKET_COLUMN}".`,
    };
  }
  if (chart === 'metric' ? x !== undefined || y.length !== 1 : x === undefined) {
    return {
      ok: false,
      error: 'A metric has exactly one y column and no x; every other chart needs an x column.',
    };
  }
  if (chart === 'bar_stacked' && breakdown === undefined) {
    return { ok: false, error: 'A bar_stacked chart needs a breakdown column.' };
  }

  const panelQuery = toPanelQuery(esql, guard.fromEnd, timeField, x);
  const result = await runChecked(run, {
    query: `${panelQuery}\n| LIMIT ${PANEL_ROW_LIMIT}`,
    ...(timeField !== null && {
      params: [
        { _tstart: new Date(now - RECENT_EVENTS_MS).toISOString() },
        { _tend: new Date(now).toISOString() },
      ],
    }),
  });
  if (!result.ok) {
    return result;
  }

  const { columns, rowCount } = result.item;
  const drawnColumns = [...(x === undefined ? [] : [x]), ...y, ...(breakdown ? [breakdown] : [])];
  const missingColumn = drawnColumns.find(
    (name) => !columns.some((column) => column.name === name)
  );
  if (missingColumn !== undefined) {
    return {
      ok: false,
      error: `The query returns no column named "${missingColumn}". It returns: ${columns
        .map(({ name }) => name)
        .join(', ')}.`,
    };
  }
  const textColumn = y.find(
    (name) =>
      !NUMERIC_COLUMN_TYPES.includes(columns.find((column) => column.name === name)?.type ?? '')
  );
  if (textColumn !== undefined) {
    return { ok: false, error: `The y column "${textColumn}" is not numeric.` };
  }
  if (hasRecentEvents && rowCount === 0) {
    return { ok: false, error: 'The query ran but returned no rows for the last 7 days.' };
  }
  if (chart === 'metric' && rowCount > 1) {
    return { ok: false, error: 'A metric query must return exactly one row.' };
  }

  const panel: ValidPanel = {
    title,
    chart,
    esql: panelQuery,
    ...(x !== undefined && { x }),
    y,
    ...(breakdown !== undefined && { breakdown }),
  };
  const { error } = lensApiConfigSchema.safeParse(toGeneratedPanelConfig(panel));
  if (error !== undefined) {
    return { ok: false, error: `The chart configuration is not valid: ${toErrorText(error)}` };
  }
  return { ok: true, item: panel };
};

const mapInBatches = async <TInput, TOutput>(
  inputs: readonly TInput[],
  map: (input: TInput) => Promise<TOutput>
): Promise<TOutput[]> => {
  const outputs: TOutput[] = [];
  for (let start = 0; start < inputs.length; start += VALIDATION_CONCURRENCY) {
    outputs.push(
      ...(await Promise.all(inputs.slice(start, start + VALIDATION_CONCURRENCY).map(map)))
    );
  }
  return outputs;
};

const getRejected = <TProposed, TValid>(
  proposed: readonly TProposed[],
  checked: ReadonlyArray<Checked<TValid>>
): Array<RejectedItem<TProposed>> =>
  checked.flatMap((result, index) =>
    result.ok ? [] : [{ index, item: proposed[index], error: result.error }]
  );

interface PartResult<TValid> {
  /** In the order the model proposed them. */
  valid: TValid[];
  counts: AnalyticsGenerationCounts;
}

/** Replaces each rejected item with its repaired version when that one passes; drops it otherwise. */
const settle = async <TProposed, TValid>({
  proposed,
  checked,
  repairs,
  validate,
}: {
  proposed: readonly TProposed[];
  checked: ReadonlyArray<Checked<TValid>>;
  repairs: ReadonlyMap<number, TProposed>;
  validate: (item: TProposed) => Promise<Checked<TValid>>;
}): Promise<PartResult<TValid>> => {
  const settled = await mapInBatches(
    checked.map((result, index) => ({ result, index })),
    async ({ result, index }): Promise<{ item?: TValid; repaired: boolean }> => {
      if (result.ok) {
        return { item: result.item, repaired: false };
      }
      const repair = repairs.get(index);
      const rechecked = repair === undefined ? undefined : await validate(repair);

      return rechecked?.ok ? { item: rechecked.item, repaired: true } : { repaired: false };
    }
  );
  const valid = settled.flatMap(({ item }) => (item === undefined ? [] : [item]));
  const validAfterRepair = settled.filter(({ item, repaired }) => item && repaired).length;

  return {
    valid,
    counts: {
      proposed: proposed.length,
      validFirstTime: valid.length - validAfterRepair,
      validAfterRepair,
      dropped: proposed.length - valid.length,
    },
  };
};

const uniqueBy = <TItem>(items: readonly TItem[], getKey: (item: TItem) => string): TItem[] =>
  items.filter(
    (item, index) => items.findIndex((other) => getKey(other) === getKey(item)) === index
  );

const layOutPanels = (panels: readonly ValidPanel[]): AnalyticsGeneratedPanel[] => {
  const metrics = panels.filter(({ chart }) => chart === 'metric').slice(0, MAX_METRIC_PANELS);
  const charts = panels
    .filter(({ chart }) => chart !== 'metric')
    .slice(0, MAX_GENERATED_PANELS - metrics.length);
  const grids = layOutDashboardGrids(metrics.length, charts.length);

  return [
    ...metrics.map((panel, index) => ({ ...panel, grid: grids.metrics[index] })),
    ...charts.map((panel, index) => ({ ...panel, grid: grids.charts[index] })),
  ];
};

export type GeneratedAnalytics = Pick<
  AnalyticsSourceGeneration,
  'source' | 'summary' | 'queries' | 'panels'
> & {
  modelCalls: number;
  counts: { queries: AnalyticsGenerationCounts; panels: AnalyticsGenerationCounts };
};

export interface GenerateSourceAnalyticsParams {
  profile: SourceProfile;
  model: GenerationModel;
  run: EsqlRunner;
  useCaseId?: AnalyticsUseCaseId;
  locale: string;
  logger: Logger;
  now?: number;
}

/**
 * Has a model write questions and dashboard panels for an event source and keeps only what runs:
 * every query is checked to read that source alone and is executed against it, rejected items go
 * back to the model once with the error, and what still fails is dropped. A part with too few
 * survivors is null, for the built-in generator to fill.
 */
export const generateSourceAnalytics = async ({
  profile,
  model,
  run,
  useCaseId,
  locale,
  logger,
  now = Date.now(),
}: GenerateSourceAnalyticsParams): Promise<GeneratedAnalytics> => {
  const prompt = buildGenerationPrompt(profile, { useCaseId, locale });
  const output = generationOutputSchema.safeParse(
    await model({ id: 'analytics_source_generation', schema: GENERATION_TOOL_SCHEMA, ...prompt })
  );
  if (!output.success) {
    throw new GenerationOutputError(
      `The model's answer does not have the requested structure: ${toErrorText(output.error)}`
    );
  }

  const context: ValidationContext = { profile, run, now };
  const questions = output.data.questions.slice(0, MAX_GENERATED_QUERIES);
  const panels = output.data.panels.slice(0, MAX_GENERATED_PANELS);
  const checkQuestion = (item: ProposedQuestion) => validateQuestion(item, context);
  const checkPanel = (item: ProposedPanel) => validatePanel(item, context);
  const checkedQuestions = await mapInBatches(questions, checkQuestion);
  const checkedPanels = await mapInBatches(panels, checkPanel);
  const rejected = {
    questions: getRejected(questions, checkedQuestions),
    panels: getRejected(panels, checkedPanels),
  };
  const needsRepair = rejected.questions.length + rejected.panels.length > 0;

  const questionRepairs = new Map<number, ProposedQuestion>();
  const panelRepairs = new Map<number, ProposedPanel>();
  if (needsRepair) {
    logger.debug(
      `Generated analytics for ${profile.source}: ${rejected.questions.length} questions and ${
        rejected.panels.length
      } panels rejected: ${[...rejected.questions, ...rejected.panels]
        .map(({ error }) => error)
        .join(' | ')}`
    );
    const repaired = repairOutputSchema.safeParse(
      await model({
        id: 'analytics_source_generation_repair',
        schema: REPAIR_TOOL_SCHEMA,
        ...buildRepairPrompt(prompt, rejected),
      })
    );
    if (repaired.success) {
      repaired.data.questions.forEach(({ index, ...item }) => questionRepairs.set(index, item));
      repaired.data.panels.forEach(({ index, ...item }) => panelRepairs.set(index, item));
    } else {
      logger.warn(
        `The repair answer for ${profile.source} was discarded: ${toErrorText(repaired.error)}`
      );
    }
  }

  const settledQuestions = await settle({
    proposed: questions,
    checked: checkedQuestions,
    repairs: questionRepairs,
    validate: checkQuestion,
  });
  const settledPanels = await settle({
    proposed: panels,
    checked: checkedPanels,
    repairs: panelRepairs,
    validate: checkPanel,
  });

  const validQueries: AnalyticsStarterQuery[] = uniqueBy(
    settledQuestions.valid,
    ({ esql }) => esql
  ).map(({ question, esql }, index) => ({ id: `generated_${index + 1}`, question, esql }));
  const laidOutPanels = layOutPanels(uniqueBy(settledPanels.valid, ({ esql }) => esql));
  const summary = output.data.summary?.trim() ?? '';

  return {
    source: profile.source,
    summary: summary === '' ? null : summary,
    queries: validQueries.length >= MIN_GENERATED_QUERIES ? validQueries : null,
    panels: laidOutPanels.length >= MIN_GENERATED_PANELS ? laidOutPanels : null,
    modelCalls: needsRepair ? 2 : 1,
    counts: { queries: settledQuestions.counts, panels: settledPanels.counts },
  };
};
