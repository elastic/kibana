/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { DonutChart } from '../../common/charts';
import { ChartWrapper } from '../../common/charts/chart_wrapper';
import { SnapshotHeading } from './snapshot_heading';
import { useSnapShotCount } from './use_snap_shot';

const SNAPSHOT_CHART_HEIGHT = 144;

interface SnapshotComponentProps {
  height?: string;
}

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const SnapshotComponent: React.FC<SnapshotComponentProps> = ({ height }) => {
  const { count, loading } = useSnapShotCount();

  return (
    <ChartWrapper loading={loading} height={height}>
      <SnapshotHeading total={count.total} />
      <EuiSpacer size="xs" />
      <DonutChart up={count.up} down={count.down} height={SNAPSHOT_CHART_HEIGHT} />
    </ChartWrapper>
  );
};
