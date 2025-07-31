/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { CRITICALITY_LEVEL_TITLE } from './translations';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';

/*
 * Map Asset Criticality status to EUI severity color pattern as per spec:
 * https://eui.elastic.co/docs/patterns/severity/index.html#use-cases
 */
export const getCriticalityLevelColor = (
  euiTheme: EuiThemeComputed,
  criticalityLevel: CriticalityLevelWithUnassigned
) => {
  const { danger, risk, warning, neutral, unknown } = euiTheme.colors.severity;
  const map = {
    extreme_impact: danger,
    high_impact: risk,
    medium_impact: warning,
    low_impact: neutral,
    unassigned: unknown,
  };

  return map[criticalityLevel] || map.unassigned;
};

export const AssetCriticalityBadge: React.FC<{
  criticalityLevel?: CriticalityLevelWithUnassigned;
  style?: CSSObject;
  className?: string;
  dataTestSubj?: string;
}> = ({
  criticalityLevel = 'unassigned',
  style,
  dataTestSubj = 'asset-criticality-badge',
  className,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiHealth
      data-test-subj={dataTestSubj}
      color={getCriticalityLevelColor(euiTheme, criticalityLevel)}
      css={style}
      className={className}
    >
      {CRITICALITY_LEVEL_TITLE[criticalityLevel]}
    </EuiHealth>
  );
};
