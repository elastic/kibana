/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge } from '@elastic/eui';
import { isString, startCase } from 'lodash/fp';
import type { CriticalityLevel } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { CRITICALITY_LEVEL_COLOR } from '../../../../../entity_analytics/components/asset_criticality';

interface Props {
  value: string | number | undefined | null;
}

const AssetCriticalityLevelComponent: React.FC<Props> = ({ value }) => {
  const color = isString(value) ? CRITICALITY_LEVEL_COLOR[value as CriticalityLevel] : 'normal';
  const stringValue = isString(value) ? value : '';

  const badge = useMemo(
    () => (
      <EuiBadge color={color} data-test-subj="AssetCriticalityLevel-score-badge">
        {startCase(stringValue)}
      </EuiBadge>
    ),
    [color, stringValue]
  );

  return badge;
};

export const AssetCriticalityLevel = React.memo(AssetCriticalityLevelComponent);
AssetCriticalityLevel.displayName = 'AssetCriticalityLevel';
