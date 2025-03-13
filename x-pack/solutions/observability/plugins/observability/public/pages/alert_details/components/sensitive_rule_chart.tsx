/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  Chart,
  Settings,
  Axis,
  Position,
  timeFormatter,
  BarSeries,
  RectAnnotation,
} from '@elastic/charts';
import '@elastic/charts/dist/theme_light.css'; // Use light or dark theme based on your UI
import { EuiCallOut } from '@elastic/eui';

const timeFormatterFn = timeFormatter('yyyy-MM-DD @ HH:mm'); // Format X-axis as hours & minutes

function ZScoreChart({
  ruleSensitivityHistory,
}: {
  ruleSensitivityHistory: Array<{ timestamp: string; zScore: number | null; numNewAlerts: number }>;
}) {
  const filtered = ruleSensitivityHistory
    .filter((d) => d.zScore !== null && d.zScore > 2) // Remove null values and keep only zScore > 2
    .sort(
      (a, b) =>
        (b.zScore ?? -Infinity) - (a.zScore ?? -Infinity) ||
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ); // Sort by zScore, then by most recent timestamp

  const top3 = filtered.length > 0 ? filtered.slice(0, Math.min(filtered.length, 5)) : [];
  return (
    <>
      <Chart size={{ height: 200, width: 500 }}>
        <Settings showLegend={false} />
        <RectAnnotation
          id="high-zscore-area"
          dataValues={[
            {
              coordinates: { y0: 2 }, // Start shading from Y=2 upwards
              details: i18n.translate('xpack.observability.zScoreChart.annotation.highDeviation', {
                defaultMessage: 'High Deviation',
              }),
            },
          ]}
          style={{ fill: 'red', opacity: 0.1 }} // Light red shading
        />
        <Axis id="x-axis" position={Position.Bottom} tickFormat={timeFormatterFn} />
        <Axis
          id="y-axis"
          position={Position.Left}
          title={i18n.translate('xpack.observability.zScoreChart.axis.zscoreLabel', {
            defaultMessage: 'Rule deviation',
          })}
          domain={{ min: -4, max: 4 }} // Set Y-axis range from -5 to 5
        />
        <BarSeries
          id="z-score-trend"
          xScaleType="time"
          yScaleType="linear"
          xAccessor={0}
          data={ruleSensitivityHistory
            .filter((d) => d.zScore !== null) // ✅ Remove null values
            .map((d) => [new Date(d.timestamp).getTime(), d.zScore ?? 0])} // Replace null with 0 if needed
          yAccessors={[1]}
        />
      </Chart>
      {top3.length === 0 ? (
        <EuiCallOut
          title={i18n.translate(
            'xpack.observability.zScoreChart.euiCallOut.goodNewsEveryoneLabel',
            { defaultMessage: 'The rule is behaving as usual!' }
          )}
          color="success"
          iconType="check"
        >
          <p>
            {i18n.translate('xpack.observability.zScoreChart.p.iHaveNoNewsLabel', {
              defaultMessage: 'Alerting rate is normal.',
            })}{' '}
            .
          </p>
        </EuiCallOut>
      ) : (
        <EuiCallOut
          title={i18n.translate(
            'xpack.observability.zScoreChart.euiCallOut.goodNewsEveryoneLabel',
            { defaultMessage: 'Rule abnormal behavior detected!' }
          )}
          color="warning"
          iconType="warning"
        >
          <p>
            {i18n.translate('xpack.observability.zScoreChart.p.iHaveNoNewsLabel', {
              defaultMessage:
                'Alerting rate is higher than usual. Deviation started in the following timestamps: ',
            })}{' '}
            <br />
            {top3.map((d) => (
              <li key={d.timestamp}>
                {d.numNewAlerts}{' '}
                {i18n.translate('xpack.observability.zScoreChart.li.alertsLabel', {
                  defaultMessage: 'alerts | ',
                })}
                {timeFormatterFn(new Date(d.timestamp).getTime())}
              </li>
            ))}
          </p>
        </EuiCallOut>
      )}
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default ZScoreChart;
