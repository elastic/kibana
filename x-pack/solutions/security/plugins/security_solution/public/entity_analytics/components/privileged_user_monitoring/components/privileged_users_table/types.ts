/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import type { EntityRiskLevels } from '../../../../../../common/api/entity_analytics/common';

export interface TableItemType extends Record<string, string | string[] | number | undefined> {
  'user.name': string;
  'labels.sources'?: string | string[];
  risk_score?: number;
  risk_level?: EntityRiskLevels;
  criticality_level?: CriticalityLevelWithUnassigned;
}
