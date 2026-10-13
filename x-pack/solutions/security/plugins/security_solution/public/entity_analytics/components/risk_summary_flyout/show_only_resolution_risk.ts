/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * True when the flyout shows a resolution group (the panel loaded alias records for the open
 * target, which only happens in `resolved` mode on the new entity analytics page) and the group's
 * risk score is available or still loading. In that case the summary shows only the group score,
 * labelled as the entity risk score; otherwise it falls back to the individual score.
 */
export const shouldShowOnlyResolutionRisk = ({
  isGroupView,
  hasResolutionScore,
  resolutionLoading,
}: {
  isGroupView: boolean;
  hasResolutionScore: boolean;
  resolutionLoading: boolean;
}): boolean => isGroupView && (hasResolutionScore || resolutionLoading);
