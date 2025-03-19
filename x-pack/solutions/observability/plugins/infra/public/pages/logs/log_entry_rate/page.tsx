/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { SubscriptionSplashPage } from '../../../components/subscription_splash_content';
import { MissingResultsPrivilegesPrompt } from '../../../components/logging/log_analysis_setup';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { AnomaliesPageTemplate, LogEntryRatePageContent } from './page_content';
import { LogEntryRatePageProviders } from './page_providers';
import { useLogsBreadcrumbs } from '../../../hooks/use_logs_breadcrumbs';
import { logsAnomaliesTitle } from '../../../translations';
import { LogMlJobIdFormatsShimProvider } from '../shared/use_log_ml_job_id_formats_shim';

export const LogEntryRatePage = () => {
  useLogsBreadcrumbs([
    {
      text: logsAnomaliesTitle,
    },
  ]);

  const { hasLogAnalysisReadCapabilities, hasLogAnalysisCapabilites } =
    useLogAnalysisCapabilitiesContext();

  if (!hasLogAnalysisCapabilites) {
    return (
      <SubscriptionSplashPage
        data-test-subj="logsLogEntryRatePage"
        pageHeader={{
          pageTitle: logsAnomaliesTitle,
        }}
      />
    );
  }

  if (!hasLogAnalysisReadCapabilities) {
    return (
      <AnomaliesPageTemplate isEmptyState={true}>
        <MissingResultsPrivilegesPrompt />
      </AnomaliesPageTemplate>
    );
  }

  return (
    <EuiErrorBoundary>
      <LogMlJobIdFormatsShimProvider>
        <LogEntryRatePageProviders>
          <LogEntryRatePageContent />
        </LogEntryRatePageProviders>
      </LogMlJobIdFormatsShimProvider>
    </EuiErrorBoundary>
  );
};
