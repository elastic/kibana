/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { AsyncStatus } from '../hooks/use_async';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { AddDataTabs } from '../views/add_data_view/types';
import { useLicenseContext } from './contexts/license/use_license_context';
import { hasProfilingData } from '../utils/has_profiling_data';
import { useProfilingStatus } from './contexts/profiling_status/use_profiling_status';
import { LicensePrompt } from './license_prompt';
import { ProfilingAppPageTemplate } from './profiling_app_page_template';
import { ProfilingStatusErrorPrompt } from './profiling_status_error_prompt';

const ADD_DATA_INSTRUCTIONS_PATHNAME = '/add-data-instructions';
const PROFILING_NOT_ENABLED_PATHNAME = '/profiling-not-enabled';

// Pages that can be opened without any profiling data. The profiling router is not used to match
// them because, at this point, the current route might not have all of its required params.
const UTILITY_PATHNAMES = [ADD_DATA_INSTRUCTIONS_PATHNAME, PROFILING_NOT_ENABLED_PATHNAME];

export function CheckStatus({ children }: { children: React.ReactElement }) {
  const { status, data, error, refresh } = useProfilingStatus();
  const license = useLicenseContext();
  const router = useProfilingRouter();
  const { pathname } = useLocation();

  if (!license?.hasAtLeast('enterprise')) {
    return (
      <ProfilingAppPageTemplate hideSearchBar>
        <LicensePrompt />
      </ProfilingAppPageTemplate>
    );
  }

  if (status !== AsyncStatus.Settled) {
    return (
      <ProfilingAppPageTemplate hideSearchBar>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              {i18n.translate('xpack.profiling.noDataConfig.loading.loaderText', {
                defaultMessage: 'Loading data sources',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ProfilingAppPageTemplate>
    );
  }

  if (error || !data) {
    return (
      <ProfilingStatusErrorPrompt
        error={error ?? new Error('The profiling status is not available')}
        onRetry={refresh}
      />
    );
  }

  if (!data.isEnabled) {
    if (pathname !== PROFILING_NOT_ENABLED_PATHNAME) {
      router.push(PROFILING_NOT_ENABLED_PATHNAME, { path: {}, query: {} });
      return null;
    }
    return children;
  }

  if (data.universalProfiling.hasLegacyData) {
    if (pathname !== ADD_DATA_INSTRUCTIONS_PATHNAME) {
      // If the cluster still has data from before 8.9.1, redirect to the add data page,
      // which shows the instructions to delete it
      router.push(ADD_DATA_INSTRUCTIONS_PATHNAME, {
        path: {},
        query: { selectedTab: AddDataTabs.Kubernetes },
      });
      return null;
    }
    return children;
  }

  if (
    (hasProfilingData(data) && data.universalProfiling.hasSetup) ||
    UTILITY_PATHNAMES.includes(pathname)
  ) {
    return children;
  }

  router.push(ADD_DATA_INSTRUCTIONS_PATHNAME, {
    path: {},
    query: { selectedTab: AddDataTabs.Kubernetes },
  });
  return null;
}
