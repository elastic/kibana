/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useEuiTheme } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import {
  createLensDefinitionForCountChart,
  IndexPattern,
  Threshold,
  Timerange,
} from './create_lens_definition';

interface LogThresholdCountChartProps {
  index: IndexPattern;
  threshold: Threshold;
  timeRange: { from: string; to: string };
  alertRange: Timerange;
  kql: string;
  height: number;
  interval?: string;
  filter?: string;
}

export function LogThresholdCountChart({
  kql,
  index,
  threshold,
  timeRange,
  alertRange,
  height,
  interval = 'auto',
  filter = '',
}: LogThresholdCountChartProps) {
  const {
    lens: { EmbeddableComponent },
  } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();
  const lensDef = createLensDefinitionForCountChart(
    index,
    euiTheme,
    kql,
    threshold,
    alertRange,
    interval,
    filter
  );
  return (
    <div>
      <EmbeddableComponent
        id="logThresholdCountChart"
        style={{ height }}
        timeRange={timeRange}
        attributes={lensDef}
        viewMode={ViewMode.VIEW}
        noPadding
      />
    </div>
  );
}
