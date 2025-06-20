/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AnnotationDomainType,
  BarSeries,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  PartialTheme,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexGroup, EuiPanel, EuiText } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-service';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useChartTheme } from '../../hooks/use_chart_theme';
import { useKibana } from '../../hooks/use_kibana';

function AnnotationTooltip({ timestamp, label }: { timestamp: number; label: React.ReactNode }) {
  const dateFormat = useKibana().services.uiSettings.get(UI_SETTINGS.DATE_FORMAT);
  const formattedTime = moment(timestamp).format(dateFormat);

  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiText size="xs">{formattedTime}</EuiText>
        <EuiText size="xs">{label}</EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function SparkPlot({
  type,
  timeseries,
  annotations,
  compressed,
}: {
  type: 'line' | 'bar';
  timeseries: Array<{ x: number; y: number | null }>;
  annotations?: Array<{
    id: string;
    x: number;
    color: string;
    icon: React.ReactNode;
    label: React.ReactNode;
  }>;
  compressed?: boolean;
}) {
  const defaultChartTheme = useChartTheme();

  const sparkplotChartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    chartPaddings: {
      top: 12,
      bottom: 12,
    },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
  };

  return (
    <Chart
      size={{
        width: 128,
        height: compressed ? 64 : 48,
      }}
    >
      <Settings
        theme={[sparkplotChartTheme, ...defaultChartTheme.theme]}
        baseTheme={defaultChartTheme.baseTheme}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      <Tooltip type="none" />
      {type && type === 'bar' ? (
        <BarSeries
          id="Sparkbar"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={timeseries}
        />
      ) : (
        <LineSeries
          id="Sparkline"
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={timeseries}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      )}
      {annotations?.map((annotation) => {
        return (
          <LineAnnotation
            key={annotation.id}
            id={annotation.id}
            dataValues={[{ dataValue: annotation.x, header: '' }]}
            domainType={AnnotationDomainType.XDomain}
            marker={annotation.icon}
            markerPosition={Position.Bottom}
            style={{
              line: {
                strokeWidth: 2,
                stroke: annotation.color,
              },
            }}
            customTooltip={({ datum }) => {
              return (
                <AnnotationTooltip
                  timestamp={(datum as { dataValue: number }).dataValue}
                  label={annotation.label}
                />
              );
            }}
          />
        );
      })}
    </Chart>
  );
}
