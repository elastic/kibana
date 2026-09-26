/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_GLOBAL_SPACE_ID } from '../../../../../common/constants';

/**
 * Space filter for reads against `.kibana-threat-reports`: the current space
 * plus the global-catalog sentinel. Writes always target the caller's concrete
 * space and never use this filter.
 */
export const buildHuntSpaceFilterTerms = (
  currentSpaceId: string
): { terms: { space_id: string[] } } => ({
  terms: { space_id: [currentSpaceId, HUNT_GLOBAL_SPACE_ID] },
});
