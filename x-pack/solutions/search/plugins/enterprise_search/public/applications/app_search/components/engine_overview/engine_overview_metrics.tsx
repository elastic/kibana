/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { TotalStats, TotalCharts, RecentApiLogs } from './components';

import { SuggestedCurationsCallout } from './components/suggested_curations_callout';

import { EngineOverviewLogic } from '.';

export const EngineOverviewMetrics: React.FC = () => {
  const { loadOverviewMetrics } = useActions(EngineOverviewLogic);
  const { dataLoading } = useValues(EngineOverviewLogic);

  useEffect(() => {
    loadOverviewMetrics();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs()}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.heading', {
          defaultMessage: 'Engine overview',
        }),
      }}
      isLoading={dataLoading}
      data-test-subj="EngineOverview"
    >
      <SuggestedCurationsCallout />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <TotalStats />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <TotalCharts />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <RecentApiLogs />
    </AppSearchPageTemplate>
  );
};
