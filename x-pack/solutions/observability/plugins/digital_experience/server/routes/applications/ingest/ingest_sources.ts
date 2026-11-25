/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_NAME, SERVICE_ENVIRONMENT, TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { termQuery, termsQuery } from '@kbn/es-query';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../../common/application_source';
import { MOBILE_FIELDS, RESULT_COLUMNS } from '../../../../common/mobile/fields';
import {
  BROWSER_SDK_LANGUAGE,
  ENVIRONMENT_FIELDS,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import { runEsql, timeFilter } from '../../../lib/esql';
import { environmentFilter } from '../../../lib/helpers/environment';
import type { HistogramParams } from '../../../lib/helpers/time_series';
import type { ApmIndices } from '../classic/create_apm_event_client';
import { CLASSIC_RUM_AGENT_NAMES } from '../classic/field_names';
import type { ApplicationCounts, IngestSource, OverTimeBucket } from './get_applications_ingest';
import type { CountsAggregations, IngestDocuments, OverTimeAggregations } from './searches';
import {
  INDEX_FIELD,
  countsSearch,
  mobileCountsQuery,
  overTimeSearch,
  toApplicationCounts,
  toIndexCounts,
} from './searches';

export interface IngestSearchParams {
  tracedEsClient: TracedElasticsearchClient;
  start: number;
  end: number;
  environment?: string;
  histogram: HistogramParams;
}

const OTEL_PATTERNS = new Set([OTEL_LOGS_INDEX, OTEL_TRACES_INDEX]);

/** A source whose documents are found with the query DSL, so its buckets match the list's. */
const webSource = (
  source: IngestSource['source'],
  documents: IngestDocuments,
  { tracedEsClient, start, end, histogram }: IngestSearchParams
): IngestSource => ({
  source,
  applicationType: APPLICATION_TYPE.web,
  getCounts: async () => {
    const response = await tracedEsClient.search(
      `get_digital_experience_${source}_ingest`,
      countsSearch({ documents, start, end })
    );
    const aggregations = response.aggregations as unknown as CountsAggregations | undefined;
    return toApplicationCounts(aggregations?.applications);
  },
  getOverTime: async (serviceNames) => {
    const response = await tracedEsClient.search(
      `get_digital_experience_${source}_ingest_over_time`,
      overTimeSearch({ documents, start, end, histogram, serviceNames })
    );
    const aggregations = response.aggregations as unknown as OverTimeAggregations | undefined;
    return (aggregations?.overTime.buckets ?? []).map(
      ({ key, indices, top }): OverTimeBucket => ({
        timestamp: key,
        indices: toIndexCounts(indices),
        applications: toApplicationCounts(top.applications),
      })
    );
  },
});

/** EDOT Browser documents: the OTel indices also hold backend services' data. */
export const otelWebSource = (params: IngestSearchParams): IngestSource =>
  webSource(
    APPLICATION_SOURCE.otel,
    {
      index: [OTEL_LOGS_INDEX, OTEL_TRACES_INDEX],
      filter: [
        ...termQuery(TELEMETRY_SDK_LANGUAGE, BROWSER_SDK_LANGUAGE),
        environmentFilter(ENVIRONMENT_FIELDS, params.environment),
      ],
    },
    params
  );

/**
 * Every document of the RUM agent, metrics included, in the space's APM indices but the EDOT ones,
 * which hold no Classic RUM data.
 */
export const classicSource = (
  { transaction, error, span, metric }: ApmIndices,
  params: IngestSearchParams
): IngestSource =>
  webSource(
    APPLICATION_SOURCE.classic,
    {
      index: [
        ...new Set(
          [transaction, error, span, metric]
            .flatMap((patterns) => patterns.split(','))
            .map((pattern) => pattern.trim())
            .filter((pattern) => pattern && !OTEL_PATTERNS.has(pattern))
        ),
      ],
      filter: [
        ...termsQuery(AGENT_NAME, CLASSIC_RUM_AGENT_NAMES),
        environmentFilter([SERVICE_ENVIRONMENT], params.environment),
      ],
    },
    params
  );

interface MobileCountRow {
  [MOBILE_FIELDS.serviceName]: string;
  [INDEX_FIELD]: string;
  [RESULT_COLUMNS.docs]: number;
}

/** EDOT Android and iOS documents; mobile applications have no chart, so no buckets. */
export const mobileSource = ({
  tracedEsClient,
  start,
  end,
  environment,
}: IngestSearchParams): IngestSource => ({
  source: APPLICATION_SOURCE.otel,
  applicationType: APPLICATION_TYPE.mobile,
  getCounts: async () => {
    const rows = await runEsql<MobileCountRow>(
      tracedEsClient,
      'get_digital_experience_mobile_ingest',
      mobileCountsQuery(),
      timeFilter(start, end, environment)
    );
    const byApplication = new Map<string, ApplicationCounts>();
    for (const row of rows) {
      const serviceName = row[MOBILE_FIELDS.serviceName];
      const counts = byApplication.get(serviceName) ?? { serviceName, indices: [] };
      counts.indices.push({ index: row[INDEX_FIELD], docs: row[RESULT_COLUMNS.docs] });
      byApplication.set(serviceName, counts);
    }
    return [...byApplication.values()];
  },
});
