/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity-store asset criticality levels (`asset.criticality`), ordered most to least
 * severe. Used to order a node's criticality distribution so consumers rendering a single
 * entry get the most severe level, and to drop levels the graph does not model.
 *
 * Declared explicitly because the values do not sort correctly as strings — alphabetically
 * `extreme_impact` sorts before `high_impact` before `low_impact` before `medium_impact`.
 *
 * Only the raw levels live here: display labels are resolved by the consumer, which
 * translates them (`CRITICALITY_LEVEL_TITLE` in security_solution). Sending labels from the
 * server would make them untranslatable and fork wording that ~15 other call sites share.
 */
export const ASSET_CRITICALITY_SEVERITY_ORDER: readonly string[] = [
  'extreme_impact',
  'high_impact',
  'medium_impact',
  'low_impact',
];

/** Whether the graph models this asset criticality level. */
export const isKnownAssetCriticalityLevel = (level: string): boolean =>
  ASSET_CRITICALITY_SEVERITY_ORDER.includes(level);
