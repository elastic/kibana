/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';
import { LogRetentionCallout, LogRetentionTooltip, LogRetentionOptions } from '../log_retention';

import { ApiLogFlyout } from './api_log';
import { ApiLogsTable, NewApiEventsPrompt, EmptyState } from './components';
import { API_LOGS_TITLE, RECENT_API_EVENTS } from './constants';

import { ApiLogsLogic } from '.';

export const ApiLogs: React.FC = () => {
  const { dataLoading, apiLogs, meta } = useValues(ApiLogsLogic);
  const { fetchApiLogs, pollForApiLogs } = useActions(ApiLogsLogic);

  useEffect(() => {
    fetchApiLogs();
  }, [meta.page.current]);

  useEffect(() => {
    pollForApiLogs();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([API_LOGS_TITLE])}
      pageHeader={{ pageTitle: API_LOGS_TITLE }}
      isLoading={dataLoading && !apiLogs.length}
      isEmptyState={!apiLogs.length}
      emptyState={<EmptyState />}
    >
      <LogRetentionCallout type={LogRetentionOptions.API} />

      <EuiPanel hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{RECENT_API_EVENTS}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LogRetentionTooltip type={LogRetentionOptions.API} />
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <NewApiEventsPrompt />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <ApiLogsTable hasPagination />
        <ApiLogFlyout />
      </EuiPanel>
    </AppSearchPageTemplate>
  );
};
