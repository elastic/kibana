/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ValidCriticalityLevels } from '../../../../../../../common/entity_analytics/asset_criticality/constants';
import type { CriticalityLevelWithUnassigned } from '../../../../../../../common/entity_analytics/asset_criticality/types';
import { AssetCriticalityBadge } from '../../../../asset_criticality';

const CRITICALITY_VALUES: readonly string[] = ValidCriticalityLevels;
const isCriticalityLevel = (value: unknown): value is CriticalityLevelWithUnassigned =>
  typeof value === 'string' && CRITICALITY_VALUES.includes(value);

export const CriticalityCell = memo(({ value }: { value: unknown }) => (
  <AssetCriticalityBadge criticalityLevel={isCriticalityLevel(value) ? value : 'unassigned'} />
));
CriticalityCell.displayName = 'CriticalityCell';
