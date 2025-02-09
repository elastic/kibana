/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { useDataStreamStats } from './hooks/use_data_stream_stats';
import { EuiFlexGroup, EuiLoadingChart, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { AreaSeries, Axis, Chart, Settings } from '@elastic/charts';
import { useKibana } from '../../hooks/use_kibana';
import { formatBytes } from './helpers/format_bytes';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

export function IngestionRate({ definition }: { definition?: IngestStreamGetResponse }) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { stats, isLoading: statsIsLoading } = useDataStreamStats({ definition });

  const ingestionRateFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition || statsIsLoading || !stats?.bytesPerDay) {
        return;
      }

      const { rawResponse } = await lastValueFrom(
        data.search.search<
          IKibanaSearchRequest,
          IKibanaSearchResponse<{
            aggregations: { docs_count: { buckets: Array<{ key: string; doc_count: number }> } };
          }>
        >(
          {
            params: {
              index: definition.stream.name,
              track_total_hits: false,
              body: {
                size: 0,
                query: {
                  bool: {
                    filter: [{ range: { '@timestamp': { gte: 'now-60d' } } }],
                  },
                },
                aggs: {
                  docs_count: {
                    date_histogram: {
                      field: '@timestamp',
                      fixed_interval: '2d',
                      min_doc_count: 0,
                    },
                  },
                },
              },
            },
          },
          { abortSignal: signal }
        )
      );

      return rawResponse.aggregations.docs_count.buckets.map(({ key, doc_count }) => ({
        key,
        value: doc_count * stats.bytesPerDay!,
      }));
    },
    [definition, stats, statsIsLoading]
  );

  const sizeUnit = useMemo(() => {
    if (!ingestionRateFetch.value) return;
    return formatBytes(Math.max(...ingestionRateFetch.value?.map(({ value }) => value))).unit;
  }, [ingestionRateFetch.value]);

  return statsIsLoading || ingestionRateFetch.loading || !ingestionRateFetch.value ? (
    <EuiLoadingChart />
  ) : (
    <>
      <EuiFlexGroup>
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EuiText>
            <h5>
              {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                defaultMessage: 'Ingestion rate',
              })}
            </h5>
          </EuiText>
        </EuiPanel>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} />
        <AreaSeries
          id="ingestionRate"
          name="Ingestion rate"
          data={ingestionRateFetch.value}
          color="#61A2FF"
          xScaleType="time"
          xAccessor={'key'}
          yAccessors={['value']}
        />

        <Axis
          id="bottom-axis"
          position="bottom"
          tickFormat={(value) => moment(value).format('YYYY-MM-DD')}
          gridLine={{ visible: false }}
        />
        <Axis
          id="left-axis"
          position="left"
          tickFormat={(value) => `${formatBytes(value, sizeUnit).value} ${sizeUnit}`}
          gridLine={{ visible: true }}
        />
      </Chart>
    </>
  );
}
