/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { AreaSeries, Axis, Chart, Settings } from '@elastic/charts';
import { formatBytes } from './helpers/format_bytes';
import { useIngestionRate } from './hooks/use_ingestion_rate';

export function IngestionRate({ definition }: { definition?: IngestStreamGetResponse }) {
  const [timeRange, setTimeRange] = useState({ start: 'now-60d', end: 'now' });

  const { isLoading, ingestionRate, refresh } = useIngestionRate({
    definition,
    start: timeRange.start,
    end: timeRange.end,
  });

  const sizeUnit = useMemo(() => {
    if (!ingestionRate) return;
    return formatBytes(Math.max(...ingestionRate.map(({ value }) => value))).unit;
  }, [ingestionRate]);

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                  defaultMessage: 'Ingestion rate',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={1}>
            <EuiSuperDatePicker
              isLoading={isLoading}
              start={timeRange.start}
              end={timeRange.end}
              onTimeChange={({ start, end }) => setTimeRange({ start, end })}
              onRefresh={() => refresh()}
              updateButtonProps={{ iconOnly: true, fill: false }}
              width="full"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="s" />

      {isLoading || !ingestionRate ? (
        <EuiLoadingChart />
      ) : (
        <Chart size={{ height: 250 }}>
          <Settings showLegend={false} />
          <AreaSeries
            id="ingestionRate"
            name="Ingestion rate"
            data={ingestionRate}
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
      )}
    </>
  );
}
