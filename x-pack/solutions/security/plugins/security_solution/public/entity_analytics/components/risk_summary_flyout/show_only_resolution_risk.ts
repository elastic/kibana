/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// True when the USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG is true and
// entity has a resolution group
export const shouldShowOnlyResolutionRisk = ({
  enabled,
  hasResolutionGroup,
  hasResolutionScore,
  resolutionLoading,
}: {
  enabled: boolean;
  hasResolutionGroup: boolean;
  hasResolutionScore: boolean;
  resolutionLoading: boolean;
}): boolean => enabled && hasResolutionGroup && (hasResolutionScore || resolutionLoading);
