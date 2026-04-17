/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_ANALYTICS_ASSET_CRITICALITY_INLINE_TOOL_ID =
  'security.entity_analytics.asset_criticality';

export { getAssetCriticalityInlineTool } from './asset_criticality';
export { getAssetCriticalityEsqlTool } from './asset_criticality_esql';
