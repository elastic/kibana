/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { UsageTrackerContextProvider } from '../contexts/usage_tracker_context';
import { useKibana } from '../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';

export const App: React.FC = () => {
  const {
    services: { usageCollection },
  } = useKibana();
  return (
    <UsageTrackerContextProvider usageCollection={usageCollection}>
      <SearchHomepageHeader showEndpointsAPIKeys={false} />
      <SearchHomepageBody />
    </UsageTrackerContextProvider>
  );
};
