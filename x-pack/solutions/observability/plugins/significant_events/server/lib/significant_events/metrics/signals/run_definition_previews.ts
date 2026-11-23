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
import {
  PREVIEW_ENTITY_COUNT_COLUMN,
  renderSignalQuery,
  type SignalQueryRenderPlan,
} from './render_signal_query';
import type {
  MeasurementDefinition,
  MeasurementDefinitionPreview,
  MeasurementPreviewRow,
} from './types';

const PREVIEW_CONCURRENCY = 4;
const PREVIEW_TIMEOUT_MS = 30_000;
const PREVIEW_WINDOW_MS = 15 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
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

const selectPreviewEntities = (rows: MeasurementPreviewRow[]): MeasurementPreviewRow[] => {
  const selectedEntities = new Set<string>();
  return rows.filter(({ entity }) => {
    if (selectedEntities.has(entity)) {
      return true;
    }
    if (selectedEntities.size === PREVIEW_ENTITY_LIMIT) {
      return false;
    }
    selectedEntities.add(entity);
    return true;
  });
};

const getPreviewEntityCount = (response: ESQLSearchResponse): number => {
  const position = response.columns.findIndex(({ name }) => name === PREVIEW_ENTITY_COUNT_COLUMN);
  const value = position >= 0 ? response.values[0]?.[position] : undefined;
  return typeof value === 'number' ? value : 0;
};

const runPreview = async ({
  esClient,
  definition,
  previewPlan,
  signal,
  from,
  to,
}: {
  esClient: ElasticsearchClient;
  definition: MeasurementDefinition;
  previewPlan: SignalQueryRenderPlan;
  signal?: AbortSignal;
  from: string;
  to: string;
}): Promise<MeasurementDefinition> => {
  const deadline = timeoutSignal(PREVIEW_TIMEOUT_MS);
  try {
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const { esql: previewQuery } = renderSignalQuery({
      ...previewPlan,
      perMinute: true,
      timeRange: { from, to },
    });
    const response = (await esClient.esql.query(
      { query: previewQuery },
      { signal: requestSignal }
    )) as ESQLSearchResponse;
    const rows = selectPreviewEntities(getPreviewRows(definition, response));
    const preview: MeasurementDefinitionPreview = {
      from,
      to,
      rows,
      truncated: getPreviewEntityCount(response) > PREVIEW_ENTITY_LIMIT,
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
  previewPlans,
  signal,
}: {
  esClient: ElasticsearchClient;
  definitions: readonly MeasurementDefinition[];
  previewPlans: readonly SignalQueryRenderPlan[];
  signal?: AbortSignal;
}): Promise<MeasurementDefinition[]> => {
  const toTime = Math.floor(Date.now() / ONE_MINUTE_MS) * ONE_MINUTE_MS;
  const from = new Date(toTime - PREVIEW_WINDOW_MS).toISOString();
  const to = new Date(toTime).toISOString();
  const limit = pLimit(PREVIEW_CONCURRENCY);

  return Promise.all(
    definitions.map((definition, index) =>
      limit(() =>
        runPreview({
          esClient,
          definition,
          previewPlan: previewPlans[index],
          signal,
          from,
          to,
        })
      )
    )
  );
};
