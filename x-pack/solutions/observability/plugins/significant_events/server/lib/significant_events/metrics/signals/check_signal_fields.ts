/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { toFromSourceQuery } from '@kbn/nightshift-shared';
import { timeoutSignal } from '@kbn/std';
import { formatDatasetList } from '../entity_rows/helpers';
import { getSignalVariantFields } from './types';
import type { SignalTemplate } from './types';

const SIGNAL_FIELD_QUERY_TIMEOUT_MS = 30_000;

export interface SignalFieldPresence {
  dataset: string;
  cluster?: string;
  fields: ReadonlySet<string>;
}

const buildSignalFieldQuery = (esql: string, templates: readonly SignalTemplate[]): string => {
  const fields = [
    ...new Set(templates.flatMap(({ variants }) => variants.flatMap(getSignalVariantFields))),
  ];
  const datasets = [
    ...new Set(templates.flatMap(({ variants }) => variants.map(({ dataset }) => dataset))),
  ];
  const aggregations = fields
    .map((field, index) => `signal_${index} = COUNT(${field})`)
    .join(',\n');

  return `SET unmapped_fields = "NULLIFY"; ${toFromSourceQuery(esql)}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset IN (${formatDatasetList(datasets)})
| STATS ${aggregations}
  BY data_stream.dataset, orchestrator.cluster.name`;
};

/** Checks every applicable signal field with one last-hour ES|QL query. */
export const checkSignalFields = async ({
  esClient,
  esql,
  datasets,
  templates,
  signal,
}: {
  esClient: ElasticsearchClient;
  esql: string;
  datasets: ReadonlyArray<string | null>;
  templates: readonly SignalTemplate[];
  signal?: AbortSignal;
}): Promise<SignalFieldPresence[]> => {
  const sourceDatasets = new Set(
    datasets.filter((dataset): dataset is string => typeof dataset === 'string')
  );
  const applicableTemplates = templates.flatMap((template): SignalTemplate[] => {
    const variants = template.variants.filter(({ dataset }) => sourceDatasets.has(dataset));
    return variants.length > 0 ? [{ ...template, variants }] : [];
  });
  if (applicableTemplates.length === 0) {
    return [];
  }

  const fields = [
    ...new Set(
      applicableTemplates.flatMap(({ variants }) => variants.flatMap(getSignalVariantFields))
    ),
  ];
  const deadline = timeoutSignal(SIGNAL_FIELD_QUERY_TIMEOUT_MS);
  try {
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const response = (await esClient.esql.query(
      { query: buildSignalFieldQuery(esql, applicableTemplates) },
      { signal: requestSignal }
    )) as ESQLSearchResponse;
    const columnPositions = new Map(
      response.columns.map(({ name }, index) => [name, index] as const)
    );
    const datasetPosition = columnPositions.get('data_stream.dataset');
    const clusterPosition = columnPositions.get('orchestrator.cluster.name');
    if (datasetPosition === undefined || clusterPosition === undefined) {
      return [];
    }

    return response.values.flatMap((values): SignalFieldPresence[] => {
      const dataset = values[datasetPosition];
      const cluster = values[clusterPosition];
      if (typeof dataset !== 'string') {
        return [];
      }
      const presentFields = fields.filter((field, index) => {
        const position = columnPositions.get(`signal_${index}`);
        return (
          position !== undefined && typeof values[position] === 'number' && values[position] > 0
        );
      });

      return [
        {
          dataset,
          cluster: typeof cluster === 'string' ? cluster : undefined,
          fields: new Set(presentFields),
        },
      ];
    });
  } finally {
    deadline.dispose();
  }
};
