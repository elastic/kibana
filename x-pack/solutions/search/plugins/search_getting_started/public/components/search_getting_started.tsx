/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';
import { AnalyticsEvents } from '../../common';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { SearchGettingStartedHeader } from './header';

export const SearchGettingStartedPage: React.FC = () => {
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.gettingStartedLoaded);
  }, [usageTracker]);

  return (
    <SearchGettingStartedPageTemplate>
      <SearchGettingStartedHeader />
    </SearchGettingStartedPageTemplate>
  );
};
