/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { CRITICALITY_LEVEL_TITLE } from './translations';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import { useCriticalityLevelColors } from '../../hooks/use_criticality_level_colors';

export const AssetCriticalityBadge: React.FC<{
  criticalityLevel?: CriticalityLevelWithUnassigned;
  style?: React.CSSProperties;
  className?: string;
  dataTestSubj?: string;
}> = ({
  criticalityLevel = 'unassigned',
  style,
  dataTestSubj = 'asset-criticality-badge',
  className,
}) => {
  const criticalityColors = useCriticalityLevelColors();
  return (
    <EuiHealth
      data-test-subj={dataTestSubj}
      color={criticalityColors[criticalityLevel]}
      style={style}
      className={className}
    >
      {CRITICALITY_LEVEL_TITLE[criticalityLevel]}
    </EuiHealth>
  );
};
