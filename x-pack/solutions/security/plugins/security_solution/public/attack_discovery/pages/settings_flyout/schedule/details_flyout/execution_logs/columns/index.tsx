/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';

import type { ScheduleRunRow } from '../types';
import * as i18n from '../translations';

const hasWorkflowData = (generation: AttackDiscoveryGeneration | undefined): boolean =>
  generation != null && (generation.workflow_id != null || generation.workflow_executions != null);

export const getColumns = (
  onViewDetails: (item: ScheduleRunRow) => void
): Array<EuiBasicTableColumn<ScheduleRunRow>> => [
  {
    render: (item: ScheduleRunRow) =>
      hasWorkflowData(item.generation) ? (
        <EuiToolTip
          content={i18n.EXECUTION_LOGS_VIEW_DETAILS}
          disableScreenReaderOutput
          position="top"
        >
          <EuiButtonIcon
            aria-label={i18n.EXECUTION_LOGS_VIEW_DETAILS}
            data-test-subj={`inspect-${item.executionUuid}`}
            iconType="inspect"
            onClick={() => onViewDetails(item)}
          />
        </EuiToolTip>
      ) : (
        <></>
      ),
    width: '40px',
  },
  {
    field: 'start',
    name: i18n.EXECUTION_LOGS_COLUMN_START,
    render: (start: string) => start,
  },
  {
    field: 'status',
    name: i18n.EXECUTION_LOGS_COLUMN_STATUS,
    render: (status: string) => status,
  },
];
