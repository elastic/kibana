/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SYSTEM_EVENTS_INDEX_PATTERN } from '@kbn/entity-store/common';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useSetupSystemEvents } from '../../../hooks/use_entity_store';
import { RUN_HISTORY_DASHBOARD_LINK_TEST_ID } from '../../../../../test_ids';

/** Links to the managed run history dashboard, installing it first if it is missing. */
export const RunHistoryLink = () => {
  const { getUrlForApp } = useKibana().services.application;
  const { data, isLoading, error } = useSetupSystemEvents({ enabled: true });
  const dashboardId = data?.dashboardId;

  return (
    <EuiPanel hasBorder>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.settings.runHistory.title"
            defaultMessage="Run history and issues"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.settings.runHistory.description"
            defaultMessage="Runs of log extraction, history snapshot and entity maintainers, failures, and engine changes over the last 30 days. Viewing the dashboard requires {privilege} on {indexPattern}."
            values={{
              privilege: <EuiCode>{'read'}</EuiCode>,
              indexPattern: <EuiCode>{SYSTEM_EVENTS_INDEX_PATTERN}</EuiCode>,
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {error ? (
        <EuiCallOut
          announceOnMount
          size="s"
          color="warning"
          iconType="warning"
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.settings.runHistory.setupError"
              defaultMessage="The run history dashboard could not be set up"
            />
          }
        />
      ) : (
        <EuiButton
          size="s"
          iconType="dashboardApp"
          isLoading={isLoading}
          isDisabled={!dashboardId}
          // The Dashboards app keeps the dashboard's own 30-day time range. The Security app would
          // apply its global time range instead.
          href={
            dashboardId ? getUrlForApp('dashboards', { path: `#/view/${dashboardId}` }) : undefined
          }
          data-test-subj={RUN_HISTORY_DASHBOARD_LINK_TEST_ID}
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.settings.runHistory.openDashboard"
            defaultMessage="Open run history dashboard"
          />
        </EuiButton>
      )}
    </EuiPanel>
  );
};
