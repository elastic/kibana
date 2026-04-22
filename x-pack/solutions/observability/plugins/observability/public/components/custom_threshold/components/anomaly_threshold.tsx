/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { Chart, Metric, Settings } from '@elastic/charts';
import { EuiIcon, EuiPanel, useEuiBackgroundColor } from '@elastic/eui';
import type { PartialTheme, Theme } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

export interface AnomalyThresholdProps {
  chartProps: {
    theme?: PartialTheme[];
    baseTheme: Theme;
  };
  id: string;
  title: string;
  value: string;
  extra?: ReactNode;
}

export function AnomalyThreshold({
  chartProps: { theme, baseTheme },
  id,
  title,
  value,
  extra,
}: AnomalyThresholdProps) {
  const color = useEuiBackgroundColor('danger');

  return (
    <EuiPanel
      paddingSize="none"
      style={{
        height: '170px',
        overflow: 'hidden',
        position: 'relative',
        minWidth: '100%',
      }}
      hasShadow={false}
      data-test-subj={`anomaly-threshold-${id}`}
      grow={false}
    >
      <Chart>
        <Settings theme={theme} baseTheme={baseTheme} locale={i18n.getLocale()} />
        <Metric
          id={id}
          data={[
            [
              {
                title,
                ...(extra != null ? { extra: <span>{extra}</span> } : {}),
                color,
                value,
                icon: ({ width, height, color: iconColor }) => (
                  <EuiIcon
                    width={width}
                    height={height}
                    color={iconColor}
                    type="warning"
                    aria-hidden={true}
                  />
                ),
              },
            ],
          ]}
        />
      </Chart>
    </EuiPanel>
  );
}
