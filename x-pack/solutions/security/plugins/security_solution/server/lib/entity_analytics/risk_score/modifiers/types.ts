/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityRecord } from '../../../../../common/api/entity_analytics';

interface ModifierTypeMap {
  asset_criticality: {
    subtype: void;
    metadata: { criticality_level: AssetCriticalityRecord['criticality_level'] | undefined };
  };
  // NOTE: When we introduce more watchlists, we'll extend this by adding a descriminated union
  watchlist: {
    subtype: 'privmon';
    metadata: { is_privileged_user: boolean | undefined };
  };
}
export type MODIFIER_TYPE = keyof ModifierTypeMap;

export type Modifier<T extends MODIFIER_TYPE> = {
  type: T;
  modifier_value?: number;
  metadata?: ModifierTypeMap[T]['metadata'];
} & (ModifierTypeMap[T]['subtype'] extends void
  ? { subtype?: never }
  : { subtype: ModifierTypeMap[T]['subtype'] });
