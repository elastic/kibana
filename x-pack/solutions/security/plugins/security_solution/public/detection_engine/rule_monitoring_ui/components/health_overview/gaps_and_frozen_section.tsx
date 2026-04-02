/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import type { HealthData } from './types';
import * as i18n from './translations';

export const GapsAndFrozenSection = memo(function GapsAndFrozenSection({
  health,
}: {
  health: HealthData;
}) {
  const stats = health.stats_over_interval;
  const { total: totalGaps, total_duration_s: gapDuration } = stats.number_of_detected_gaps;
  const frozenCount = stats.frozen_indices_queried_max_count;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiStat
          title={totalGaps}
          description={i18n.TOTAL_DETECTED_GAPS}
          titleColor={totalGaps > 0 ? 'danger' : 'default'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={`${gapDuration}s`}
          description={i18n.TOTAL_GAP_DURATION}
          titleColor={gapDuration > 0 ? 'danger' : 'default'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={frozenCount}
          description={i18n.FROZEN_INDICES_QUERIED}
          titleColor={frozenCount > 0 ? 'accent' : 'default'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
