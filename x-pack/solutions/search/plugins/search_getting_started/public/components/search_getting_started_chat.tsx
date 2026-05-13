/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';

import { AnalyticsEvents } from '../../common';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';

export const SearchGettingStartedChatPage = () => {
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(AnalyticsEvents.gettingStartedChatLoaded);
    sessionStorage.setItem(GETTING_STARTED_SESSIONSTORAGE_KEY, 'true');
  }, [usageTracker]);

  return (
    <SearchGettingStartedPageTemplate>
      <EuiPageTemplate.Section data-test-subj="gettingStartedChat">
        <EuiLoadingSpinner />
      </EuiPageTemplate.Section>
    </SearchGettingStartedPageTemplate>
  );
};
