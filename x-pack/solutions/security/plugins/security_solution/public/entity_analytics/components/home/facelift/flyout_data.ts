/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable import path for facelift flyout mocks.
 * Routes to the active version snapshot under `./v1`–`./v5`.
 */

import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskScoreState } from '../../../api/hooks/use_risk_score';
import { getActiveFaceliftVersion } from './active_version';
import * as v1 from './v1/flyout_data';
import * as v2 from './v2/flyout_data';
import * as v3 from './v3/flyout_data';
import * as v4 from './v4/flyout_data';
import * as v5 from './v5/flyout_data';

const impl = () => {
  switch (getActiveFaceliftVersion()) {
    case 'v1':
      return v1;
    case 'v2':
      return v2;
    case 'v3':
      return v3;
    case 'v4':
      return v4;
    case 'v5':
      return v5;
  }
};

export const USE_FACELIFT_MOCK_FLYOUT = v2.USE_FACELIFT_MOCK_FLYOUT;

export type FaceliftEntityStoreRecord = v2.FaceliftEntityStoreRecord;
export type FaceliftAlertsByStatus = v2.FaceliftAlertsByStatus;

export const isFaceliftMockEntityId = (
  ...args: Parameters<typeof v2.isFaceliftMockEntityId>
): ReturnType<typeof v2.isFaceliftMockEntityId> => impl().isFaceliftMockEntityId(...args);

export const getFaceliftEntityStoreRecord = (
  ...args: Parameters<typeof v2.getFaceliftEntityStoreRecord>
): ReturnType<typeof v2.getFaceliftEntityStoreRecord> =>
  impl().getFaceliftEntityStoreRecord(...args);

export const getFaceliftRiskScoreState = <T extends EntityType>(
  entityType: T,
  entityId: string
): RiskScoreState<T> | null => impl().getFaceliftRiskScoreState(entityType, entityId);

export const getFaceliftAnomalyOverview = (
  ...args: Parameters<typeof v2.getFaceliftAnomalyOverview>
): ReturnType<typeof v2.getFaceliftAnomalyOverview> => impl().getFaceliftAnomalyOverview(...args);

export const getFaceliftAlertsByStatus = (
  ...args: Parameters<typeof v2.getFaceliftAlertsByStatus>
): ReturnType<typeof v2.getFaceliftAlertsByStatus> => impl().getFaceliftAlertsByStatus(...args);

export const getFaceliftResolutionGroup = (
  ...args: Parameters<typeof v2.getFaceliftResolutionGroup>
): ReturnType<typeof v2.getFaceliftResolutionGroup> => impl().getFaceliftResolutionGroup(...args);
