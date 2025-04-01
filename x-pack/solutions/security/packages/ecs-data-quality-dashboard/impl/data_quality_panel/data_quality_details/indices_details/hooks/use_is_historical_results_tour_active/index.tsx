/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { HISTORICAL_RESULTS_TOUR_IS_DISMISSED_STORAGE_KEY } from '../../constants';

export const useIsHistoricalResultsTourActive = () => {
  const [isTourDismissed, setIsTourDismissed] = useLocalStorage<boolean>(
    HISTORICAL_RESULTS_TOUR_IS_DISMISSED_STORAGE_KEY,
    false
  );

  const isTourActive = !isTourDismissed;
  const setIsTourActive = useCallback(
    (active: boolean) => {
      setIsTourDismissed(!active);
    },
    [setIsTourDismissed]
  );

  return [isTourActive, setIsTourActive] as const;
};
