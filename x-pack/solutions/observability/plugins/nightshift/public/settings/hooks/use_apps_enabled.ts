/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { useKibana } from '../../hooks/use_kibana';

export const useAppsEnabled = (): boolean | undefined => {
  const { featureFlags } = useKibana().services;

  // getBooleanValue$ builds a new observable on every call, so memoize it.
  // Otherwise useObservable re-subscribes and re-evaluates the flag on every render.
  const isAppsEnabledObservable = useMemo(
    () => featureFlags.getBooleanValue$(NIGHTSHIFT_ENABLED_FLAG, false),
    [featureFlags]
  );

  return useObservable(isAppsEnabledObservable);
};
