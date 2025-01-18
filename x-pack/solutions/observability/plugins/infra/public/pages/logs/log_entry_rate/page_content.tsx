/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useCallback, useEffect } from 'react';
import useInterval from 'react-use/lib/useInterval';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import {
  isJobStatusWithResults,
  logEntryCategoriesJobType,
  logEntryRateJobType,
} from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisSetupStatusUnknownPrompt,
  MissingSetupPrivilegesPrompt,
} from '../../../components/logging/log_analysis_setup';
import {
  LogAnalysisSetupFlyout,
  useLogAnalysisSetupFlyoutStateContext,
} from '../../../components/logging/log_analysis_setup/setup_flyout';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useLogEntryRateModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { LogsPageTemplate } from '../shared/page_template';
import { LogEntryRateResultsContent } from './page_results_content';
import { LogEntryRateSetupContent } from './page_setup_content';
import { useLogMlJobIdFormatsShimContext } from '../shared/use_log_ml_job_id_formats_shim';

const JOB_STATUS_POLLING_INTERVAL = 30000;

const logsAnomaliesTitle = i18n.translate('xpack.infra.logs.anomaliesPageTitle', {
  defaultMessage: 'Anomalies',
});

export const LogEntryRatePageContent = memo(() => {
  const { hasLogAnalysisReadCapabilities, hasLogAnalysisSetupCapabilities } =
    useLogAnalysisCapabilitiesContext();

  const {
    fetchJobStatus: fetchLogEntryCategoriesJobStatus,
    fetchModuleDefinition: fetchLogEntryCategoriesModuleDefinition,
    jobStatus: logEntryCategoriesJobStatus,
    setupStatus: logEntryCategoriesSetupStatus,
  } = useLogEntryCategoriesModuleContext();
  const {
    fetchJobStatus: fetchLogEntryRateJobStatus,
    fetchModuleDefinition: fetchLogEntryRateModuleDefinition,
    jobStatus: logEntryRateJobStatus,
    setupStatus: logEntryRateSetupStatus,
  } = useLogEntryRateModuleContext();

  const { showModuleList } = useLogAnalysisSetupFlyoutStateContext();

  const fetchAllJobStatuses = useCallback(
    () => Promise.all([fetchLogEntryCategoriesJobStatus(), fetchLogEntryRateJobStatus()]),
    [fetchLogEntryCategoriesJobStatus, fetchLogEntryRateJobStatus]
  );

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchAllJobStatuses();
    }
  }, [fetchAllJobStatuses, hasLogAnalysisReadCapabilities]);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchLogEntryCategoriesModuleDefinition();
    }
  }, [fetchLogEntryCategoriesModuleDefinition, hasLogAnalysisReadCapabilities]);

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchLogEntryRateModuleDefinition();
    }
  }, [fetchLogEntryRateModuleDefinition, hasLogAnalysisReadCapabilities]);

  useInterval(() => {
    if (logEntryCategoriesSetupStatus.type !== 'pending' && hasLogAnalysisReadCapabilities) {
      fetchLogEntryCategoriesJobStatus();
    }
    if (logEntryRateSetupStatus.type !== 'pending' && hasLogAnalysisReadCapabilities) {
      fetchLogEntryRateJobStatus();
    }
  }, JOB_STATUS_POLLING_INTERVAL);

  const { idFormats } = useLogMlJobIdFormatsShimContext();

  if (
    logEntryCategoriesSetupStatus.type === 'initializing' ||
    logEntryRateSetupStatus.type === 'initializing'
  ) {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.analysisPage.loadingMessage', {
          defaultMessage: 'Checking status of analysis jobs...',
        })}
      />
    );
  } else if (
    logEntryCategoriesSetupStatus.type === 'unknown' ||
    logEntryRateSetupStatus.type === 'unknown'
  ) {
    return (
      <AnomaliesPageTemplate isEmptyState={true}>
        <LogAnalysisSetupStatusUnknownPrompt retry={fetchAllJobStatuses} />
      </AnomaliesPageTemplate>
    );
  } else if (
    isJobStatusWithResults(logEntryCategoriesJobStatus[logEntryCategoriesJobType]) ||
    isJobStatusWithResults(logEntryRateJobStatus[logEntryRateJobType])
  ) {
    return (
      <>
        <LogEntryRateResultsContent idFormats={idFormats} pageTitle={logsAnomaliesTitle} />
        <LogAnalysisSetupFlyout />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return (
      <AnomaliesPageTemplate isEmptyState={true}>
        <MissingSetupPrivilegesPrompt />;
      </AnomaliesPageTemplate>
    );
  } else {
    return (
      <>
        <AnomaliesPageTemplate isEmptyState={true}>
          <LogEntryRateSetupContent onOpenSetup={showModuleList} />
        </AnomaliesPageTemplate>
        <LogAnalysisSetupFlyout />
      </>
    );
  }
});

export const AnomaliesPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = ({
  children,
  ...rest
}) => {
  const { logViewStatus } = useLogViewContext();
  return (
    <LogsPageTemplate
      hasData={logViewStatus?.index !== 'missing'}
      data-test-subj="logsLogEntryRatePage"
      pageHeader={
        rest.isEmptyState
          ? undefined
          : {
              pageTitle: logsAnomaliesTitle,
            }
      }
      {...rest}
    >
      {children}
    </LogsPageTemplate>
  );
};
