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
import { useLicenseContext } from './contexts/license/use_license_context';
import { LicensePrompt } from './license_prompt';
import { ProfilingAppPageTemplate } from './profiling_app_page_template';
import { useProfilingSetupStatus } from './contexts/profiling_setup_status/use_profiling_setup_status';

export function CheckSetup({ children }: { children: React.ReactElement }) {
  const { profilingSetupStatus, status } = useProfilingSetupStatus();
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

  if (profilingSetupStatus?.pre_8_9_1_data === true && pathname !== '/delete_data_instructions') {
    router.push('/delete_data_instructions', { path: {}, query: {} });
    return null;
  }

  if (
    profilingSetupStatus?.type === 'serverless' &&
    profilingSetupStatus.profiling_enabled === false &&
    pathname !== '/profiling-not-enabled'
  ) {
    router.push('/profiling-not-enabled', { path: {}, query: {} });
    return null;
  }

  return children;
}
