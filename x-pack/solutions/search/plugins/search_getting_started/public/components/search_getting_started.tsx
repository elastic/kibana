/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AnalyticsEvents, PLUGIN_NAME } from '../../common';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';
import { ConsoleTutorialsGroup } from './tutorials/console_tutorials_group';
import { SearchGettingStartedConnectCode } from './connect_code';
import { GettingStartedFooter } from './footer';

export const SearchGettingStartedPage: React.FC = () => {
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.gettingStartedLoaded);
  }, [usageTracker]);

  return (
    <SearchGettingStartedPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={PLUGIN_NAME}
        description={i18n.translate('xpack.search.gettingStarted.page.description', {
          defaultMessage: 'Get started with Elasticsearch',
        })}
      />
      <EuiPageTemplate.Section paddingSize="xl">
        <ConsoleTutorialsGroup />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section data-test-subj="search-getting-code-example">
        <SearchGettingStartedConnectCode />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <GettingStartedFooter />
      </EuiPageTemplate.Section>
    </SearchGettingStartedPageTemplate>
  );
};
