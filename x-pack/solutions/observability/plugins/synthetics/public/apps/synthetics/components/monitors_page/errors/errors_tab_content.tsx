/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiProgress } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrorsList } from '../../monitor_details/monitor_errors/errors_list';
import { ErrorGroupsList } from './error_groups_list';
import { ErrorStatsPanel } from './error_stats_panel';
import { TopFailingMonitors } from './top_failing_monitors';
import { ErrorsOverTimeChart } from './errors_over_time_chart';
import { ErrorInsightsPanel } from './error_insights_panel';
import type { PingState } from '../../../../../../common/runtime_types';
import type { ErrorGroup, ErrorStats } from '../../../../../../common/runtime_types';
import { PanelWithTitle } from '../../common/components/panel_with_title';

export const ErrorsTabContent = ({
  errorStates,
  loading,
  upStates,
  errorGroups,
  errorGroupsLoading,
  errorStats,
  errorStatsLoading,
}: {
  errorStates: PingState[];
  upStates: PingState[];
  loading: boolean;
  errorGroups: ErrorGroup[];
  errorGroupsLoading: boolean;
  errorStats: ErrorStats | null;
  errorStatsLoading: boolean;
}) => {
  const isAnyLoading = loading || errorGroupsLoading || errorStatsLoading;

  return (
    <div style={{ position: 'relative' }}>
      {isAnyLoading && (
        <EuiProgress
          size="xs"
          color="accent"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
        />
      )}
      <ErrorStatsPanel stats={errorStats} loading={errorStatsLoading} />
      <EuiSpacer size="m" />
      <ErrorsOverTimeChart groups={errorGroups} loading={errorGroupsLoading} />
      <EuiSpacer size="m" />
      <TopFailingMonitors
        monitors={errorStats?.topFailingMonitors ?? []}
        loading={errorStatsLoading}
      />
      <EuiSpacer size="m" />
      <ErrorInsightsPanel insights={errorStats?.insights ?? null} loading={errorStatsLoading} />
      <EuiSpacer size="m" />
      <PanelWithTitle title={ERROR_GROUPS_LABEL}>
        <ErrorGroupsList groups={errorGroups} loading={errorGroupsLoading} />
      </PanelWithTitle>
      <EuiSpacer size="m" />
      <PanelWithTitle title={ERRORS_LABEL}>
        <ErrorsList
          errorStates={errorStates}
          upStates={upStates}
          loading={loading}
          showMonitorName={true}
        />
      </PanelWithTitle>
    </div>
  );
};

const ERRORS_LABEL = i18n.translate('xpack.synthetics.errors.label', {
  defaultMessage: 'Errors',
});

const ERROR_GROUPS_LABEL = i18n.translate('xpack.synthetics.errors.errorGroups', {
  defaultMessage: 'Error groups',
});
