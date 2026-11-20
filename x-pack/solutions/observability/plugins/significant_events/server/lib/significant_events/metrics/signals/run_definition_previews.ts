/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { timeoutSignal } from '@kbn/std';
import { DEFINITION_PREVIEW_LIMIT, renderDefinitionPreviewQuery } from './render_signal_query';
import type {
  MeasurementDefinition,
  MeasurementDefinitionPreview,
  MeasurementPreviewRow,
} from './types';

const PREVIEW_CONCURRENCY = 4;
const PREVIEW_TIMEOUT_MS = 30_000;
const PREVIEW_WINDOW_MS = 15 * 60 * 1000;
const PREVIEW_ENTITY_LIMIT = 10;

type PreviewScalar = string | number | boolean | null;

const toScalar = (value: ESQLSearchResponse['values'][number][number]): PreviewScalar =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  value === null
    ? value
    : null;

const getPreviewRows = (
  definition: MeasurementDefinition,
  response: ESQLSearchResponse
): MeasurementPreviewRow[] => {
  const positions = new Map(response.columns.map(({ name }, index) => [name, index] as const));
  const minutePosition = positions.get('minute');
  const valuePosition = positions.get(definition.value_column);
  if (minutePosition === undefined || valuePosition === undefined) {
    throw new Error('Preview response is missing its minute or value column.');
  }

  return response.values.flatMap((values): MeasurementPreviewRow[] => {
    const minute = toScalar(values[minutePosition]);
    const value = toScalar(values[valuePosition]);
    if (typeof minute !== 'string' || typeof value !== 'number') {
      return [];
    }
    const entity = definition.entity_fields
      .map((field) => {
        const position = positions.get(field);
        return position === undefined ? '' : String(toScalar(values[position]) ?? '');
      })
      .join('/');
    const context = definition.context_columns.reduce<Record<string, PreviewScalar>>(
      (row, column) => {
        const position = positions.get(column);
        row[column] = position === undefined ? null : toScalar(values[position]);
        return row;
      },
      {}
    );
    return [{ entity, minute, value, ...context }];
  });
};

const selectPreviewEntities = (
  definition: MeasurementDefinition,
  rows: MeasurementPreviewRow[]
): MeasurementPreviewRow[] => {
  const latestByEntity = new Map<string, MeasurementPreviewRow>();
  for (const row of rows) {
    const latest = latestByEntity.get(row.entity);
    if (!latest || row.minute > latest.minute) {
      latestByEntity.set(row.entity, row);
    }
  }
  const lowerIsWorse = definition.hint.comparison === '<';
  const selectedEntities = new Set(
    [...latestByEntity.values()]
      .sort(
        (left, right) =>
          (lowerIsWorse ? left.value - right.value : right.value - left.value) ||
          left.entity.localeCompare(right.entity)
      )
      .slice(0, PREVIEW_ENTITY_LIMIT)
      .map(({ entity }) => entity)
  );

  return rows
    .filter(({ entity }) => selectedEntities.has(entity))
    .sort(
      (left, right) =>
        left.minute.localeCompare(right.minute) || left.entity.localeCompare(right.entity)
    );
};

const runPreview = async ({
  esClient,
  definition,
  signal,
  from,
  to,
}: {
  esClient: ElasticsearchClient;
  definition: MeasurementDefinition;
  signal?: AbortSignal;
  from: string;
  to: string;
}): Promise<MeasurementDefinition> => {
  const deadline = timeoutSignal(PREVIEW_TIMEOUT_MS);
  try {
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const response = (await esClient.esql.query(
      { query: renderDefinitionPreviewQuery(definition.esql) },
      { signal: requestSignal }
    )) as ESQLSearchResponse;
    const rows = selectPreviewEntities(definition, getPreviewRows(definition, response));
    const preview: MeasurementDefinitionPreview = {
      from,
      to,
      rows,
      truncated: response.values.length === DEFINITION_PREVIEW_LIMIT,
    };
    return { ...definition, preview };
  } catch (error) {
    return {
      ...definition,
      preview: {
        from,
        to,
        rows: [],
        truncated: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    deadline.dispose();
  }
};

/** Runs definition previews with bounded concurrency and isolates query failures. */
export const runDefinitionPreviews = async ({
  esClient,
  definitions,
  signal,
}: {
  esClient: ElasticsearchClient;
  definitions: readonly MeasurementDefinition[];
  signal?: AbortSignal;
}): Promise<MeasurementDefinition[]> => {
  const toDate = new Date();
  const from = new Date(toDate.getTime() - PREVIEW_WINDOW_MS).toISOString();
  const to = toDate.toISOString();
  const limit = pLimit(PREVIEW_CONCURRENCY);

  return Promise.all(
    definitions.map((definition) =>
      limit(() => runPreview({ esClient, definition, signal, from, to }))
    )
  );
};
