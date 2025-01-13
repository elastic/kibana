/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SeriesConfig, SeriesUrl } from '../../types';
import { SeriesColorPicker } from '../../components/series_color_picker';
import { SeriesChartTypes } from './chart_type_select';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}

export function SeriesInfo({ seriesId, series, seriesConfig }: Props) {
  if (!seriesConfig) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <SeriesChartTypes seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SeriesColorPicker seriesId={seriesId} series={series} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return null;
}
