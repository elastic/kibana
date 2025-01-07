/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { ENGINE_API_LOGS_PATH } from '../../../routes';
import { ApiLogsLogic, ApiLogsTable, NewApiEventsPrompt, ApiLogFlyout } from '../../api_logs';
import { RECENT_API_EVENTS } from '../../api_logs/constants';
import { DataPanel } from '../../data_panel';
import { generateEnginePath } from '../../engine';

import { VIEW_API_LOGS } from '../constants';

export const RecentApiLogs: React.FC = () => {
  const { fetchApiLogs, pollForApiLogs } = useActions(ApiLogsLogic);

  useEffect(() => {
    fetchApiLogs();
    pollForApiLogs();
  }, []);

  return (
    <DataPanel
      title={<h2>{RECENT_API_EVENTS}</h2>}
      action={
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <NewApiEventsPrompt />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmptyTo iconType="eye" to={generateEnginePath(ENGINE_API_LOGS_PATH)} size="s">
              {VIEW_API_LOGS}
            </EuiButtonEmptyTo>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      hasBorder
    >
      <ApiLogsTable />
      <ApiLogFlyout />
    </DataPanel>
  );
};
