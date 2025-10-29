/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useSearchGettingStartedFeatureFlag } from '../hooks/use_search_getting_started_feature_flag';

interface Props {
  coreStart: CoreStart;
  children: React.ReactNode;
}

export const GettingStartedRedirectGate = ({ coreStart, children }: Props) => {
  const isGettingStartedEnabled = useSearchGettingStartedFeatureFlag();
  useEffect(() => {
    const visited = localStorage.getItem(GETTING_STARTED_LOCALSTORAGE_KEY);
    if (isGettingStartedEnabled && (!visited || visited === 'false')) {
      coreStart.application.navigateToApp('searchGettingStarted');
    }
  }, [coreStart, isGettingStartedEnabled]);

  return <>{children}</>;
};
