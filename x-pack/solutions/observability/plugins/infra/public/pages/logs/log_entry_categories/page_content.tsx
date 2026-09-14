/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import { isJobStatusWithResults, logEntryCategoriesJobType } from '../../../../common/log_analysis';
import { LoadingPrompt } from '../../../components/loading_page';
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
import { LogsAppHeader, logCategoriesPageTitle } from '../header';
import { LogsPageTemplate } from '../shared/page_template';
import { LogEntryCategoriesResultsContent } from './page_results_content';
import { LogEntryCategoriesSetupContent } from './page_setup_content';
import { useLogMlJobIdFormatsShimContext } from '../shared/use_log_ml_job_id_formats_shim';

export const LogEntryCategoriesPageContent = () => {
  const { hasLogAnalysisReadCapabilities, hasLogAnalysisSetupCapabilities } =
    useLogAnalysisCapabilitiesContext();

  const { fetchJobStatus, setupStatus, jobStatus } = useLogEntryCategoriesModuleContext();

  const { showModuleSetup } = useLogAnalysisSetupFlyoutStateContext();
  const showCategoriesModuleSetup = useCallback(
    () => showModuleSetup('logs_ui_categories'),
    [showModuleSetup]
  );

  useEffect(() => {
    if (hasLogAnalysisReadCapabilities) {
      fetchJobStatus();
    }
  }, [fetchJobStatus, hasLogAnalysisReadCapabilities]);

  const { idFormats } = useLogMlJobIdFormatsShimContext();

  if (setupStatus.type === 'initializing') {
    return (
      <CategoriesPageTemplate isEmptyState={true}>
        <LoadingPrompt
          message={i18n.translate('xpack.infra.logs.logEntryCategories.jobStatusLoadingMessage', {
            defaultMessage: 'Checking status of categorization jobs...',
          })}
        />
      </CategoriesPageTemplate>
    );
  } else if (setupStatus.type === 'unknown') {
    return (
      <CategoriesPageTemplate isEmptyState={true}>
        <LogAnalysisSetupStatusUnknownPrompt retry={fetchJobStatus} />
      </CategoriesPageTemplate>
    );
  } else if (isJobStatusWithResults(jobStatus[logEntryCategoriesJobType])) {
    return (
      <>
        <LogEntryCategoriesResultsContent
          onOpenSetup={showCategoriesModuleSetup}
          pageTitle={logCategoriesPageTitle}
          idFormat={idFormats![logEntryCategoriesJobType]}
        />
        <LogAnalysisSetupFlyout allowedModules={allowedSetupModules} />
      </>
    );
  } else if (!hasLogAnalysisSetupCapabilities) {
    return (
      <CategoriesPageTemplate isEmptyState={true}>
        <MissingSetupPrivilegesPrompt />
      </CategoriesPageTemplate>
    );
  } else {
    return (
      <>
        <CategoriesPageTemplate isEmptyState={true}>
          <LogEntryCategoriesSetupContent onOpenSetup={showCategoriesModuleSetup} />
        </CategoriesPageTemplate>
        <LogAnalysisSetupFlyout allowedModules={allowedSetupModules} />
      </>
    );
  }
};

const allowedSetupModules = ['logs_ui_categories' as const];

export const CategoriesPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = ({
  children,
  ...rest
}) => {
  const { logViewStatus } = useLogViewContext();
  return (
    <LogsPageTemplate
      hasData={logViewStatus?.index !== 'missing'}
      data-test-subj="logsLogEntryCategoriesPage"
      header={<LogsAppHeader title={logCategoriesPageTitle} />}
      {...rest}
    >
      {children}
    </LogsPageTemplate>
  );
};
