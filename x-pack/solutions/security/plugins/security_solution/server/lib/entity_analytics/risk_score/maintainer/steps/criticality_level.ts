/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetCriticalityLevel } from '../../../../../../common/api/entity_analytics/asset_criticality/common.gen';

/**
 * A store value as a criticality level. Most entities have none, so a missing value skips the
 * schema: a failed parse builds an error for every row it runs on.
 */
export const toCriticalityLevel = (value: unknown): AssetCriticalityLevel | undefined => {
  if (value == null) {
    return undefined;
  }
  const parsed = AssetCriticalityLevel.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};
