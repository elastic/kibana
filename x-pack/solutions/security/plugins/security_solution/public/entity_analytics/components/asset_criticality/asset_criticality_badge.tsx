/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { CRITICALITY_LEVEL_TITLE } from './translations';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';

// below will be updated with new severity color palette & shared security wide severity colors hook creation
export const CRITICALITY_LEVEL_COLOR: Record<CriticalityLevelWithUnassigned, string> = {
  extreme_impact: '#E7664C',
  high_impact: '#DA8B45',
  medium_impact: 'D6BF57',
  low_impact: '#54B399',
  unassigned: euiLightVars.euiColorMediumShade,
};

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
  return (
    <EuiHealth
      data-test-subj={dataTestSubj}
      color={CRITICALITY_LEVEL_COLOR[criticalityLevel]}
      style={style}
      className={className}
    >
      {CRITICALITY_LEVEL_TITLE[criticalityLevel]}
    </EuiHealth>
  );
};
