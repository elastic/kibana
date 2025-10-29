/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../common';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';
import { ConsoleTutorialsGroup } from './tutorials/console_tutorials_group';
import { SearchGettingStartedConnectCode } from './connect_code';
import { GettingStartedFooter } from './footer';
import { SearchGettingStartedHeader } from './header';

export const SearchGettingStartedPage: React.FC = () => {
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(AnalyticsEvents.gettingStartedLoaded);
  }, [usageTracker]);

  return (
    <SearchGettingStartedPageTemplate>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <SearchGettingStartedHeader />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl">
        <ConsoleTutorialsGroup />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section data-test-subj="gettingStartedCodeExamples">
        <SearchGettingStartedConnectCode />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <GettingStartedFooter />
      </EuiPageTemplate.Section>
    </SearchGettingStartedPageTemplate>
  );
};
