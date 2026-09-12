/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Platform values as they appear in the ATLAS YAML `platforms` field / atlas.mitre.org. */
export const ATLAS_PLATFORMS = [
  'Predictive AI',
  'Generative AI',
  'Agentic AI',
  'Enterprise',
] as const;

export type AtlasPlatform = (typeof ATLAS_PLATFORMS)[number];

export const ATLAS_PLATFORMS_DEFAULT_SELECTED: AtlasPlatform[] = [...ATLAS_PLATFORMS];

export const techniqueMatchesSelectedPlatforms = (
  platforms: string[],
  selectedPlatforms: readonly string[]
): boolean => {
  if (selectedPlatforms.length === 0) {
    return false;
  }
  return platforms.some((platform) => selectedPlatforms.includes(platform));
};
