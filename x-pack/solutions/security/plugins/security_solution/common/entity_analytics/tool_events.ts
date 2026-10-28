/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSET_CRITICALITY_UPDATED_TOOL_EVENT = 'asset_criticality_updated' as const;

export interface AssetCriticalityUpdatedToolEventData {
  entityType: string;
}

/**
 * Signal-only — consumers just invalidate their resolution-group queries unconditionally,
 * there's no payload to carry.
 */
export const RESOLUTION_GROUP_UPDATED_TOOL_EVENT = 'resolution_group_updated' as const;
