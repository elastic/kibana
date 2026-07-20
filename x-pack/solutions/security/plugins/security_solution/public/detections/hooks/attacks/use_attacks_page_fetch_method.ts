/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  fetchQueryAttacks,
  fetchQueryUnifiedAlerts,
} from '../../containers/detection_engine/alerts/api';

/**
 * Returns the fetch method for attacks page search queries.
 * Uses the public attacks API when `publicAttacksApiEnabled` is on,
 * otherwise falls back to the internal unified alerts API.
 */
export const useAttacksPageFetchMethod = () => {
  const isPublicAttacksApiEnabled = useIsExperimentalFeatureEnabled('publicAttacksApiEnabled');

  return useMemo(
    () => (isPublicAttacksApiEnabled ? fetchQueryAttacks : fetchQueryUnifiedAlerts),
    [isPublicAttacksApiEnabled]
  );
};
