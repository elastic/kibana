/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import React, { memo } from 'react';
import type { HealthData } from './constants';

export const GapsAndFrozenSection = memo<{ health: HealthData }>(({ health }) => {
  const stats = health.stats_over_interval;
  const { total: totalGaps, total_duration_s: gapDuration } = stats.number_of_detected_gaps;
  const frozenCount = stats.frozen_indices_queried_max_count;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiStat
          title={totalGaps}
          description="Total Detected Gaps"
          titleColor={totalGaps > 0 ? 'danger' : 'default'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={`${gapDuration}s`}
          description="Total Gap Duration"
          titleColor={gapDuration > 0 ? 'danger' : 'default'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={frozenCount}
          description="Frozen Indices Queried (Max)"
          titleColor={frozenCount > 0 ? 'accent' : 'default'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
GapsAndFrozenSection.displayName = 'GapsAndFrozenSection';
