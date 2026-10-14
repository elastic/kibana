/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The levels the "Set asset criticality" action accepts, weakest first. Packaging proposes one of
 * them for an implicated user or service, and ranks them when it decides whether a live Proposal
 * already covers a finding. The action's own definition (`action_set_asset_criticality.yaml`) is
 * where the set comes from, and the proposal gate's lost-race note ranks the same list in Liquid:
 * a test keeps all three together, so a level added to the action cannot start being proposed
 * while reading as unknown here.
 */
export const ASSET_CRITICALITY_LEVELS = [
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
] as const;

export type AssetCriticalityLevel = (typeof ASSET_CRITICALITY_LEVELS)[number];

/** What a confirmed finding marks an identity as. */
export const CONFIRMED_FINDING_CRITICALITY = 'high_impact' as const satisfies AssetCriticalityLevel;

/** What a finding from a critical report marks an identity as: one level higher. */
export const CRITICAL_FINDING_CRITICALITY =
  'extreme_impact' as const satisfies AssetCriticalityLevel;
