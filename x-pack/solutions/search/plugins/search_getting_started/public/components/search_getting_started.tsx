/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import React, { useEffect } from 'react';
import { AnalyticsEvents } from '../../common';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';
import { ConsoleTutorialsGroup } from './tutorials/console_tutorials_group';

export const SearchGettingStartedPage: React.FC = () => {
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.gettingStartedLoaded);
  }, [usageTracker]);

  return (
    <SearchGettingStartedPageTemplate>
      <EuiPageTemplate.Section paddingSize="xl">
        <ConsoleTutorialsGroup />
      </EuiPageTemplate.Section>
    </SearchGettingStartedPageTemplate>
  );
};
