/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiBasicTable, EuiText } from '@elastic/eui';
import React, { memo } from 'react';
import { SectionPanel } from '../section_panel';
import type { HealthData } from './constants';

interface TopMessageItem {
  message: string;
  count: number;
}

const TOP_MSG_COLUMNS: Array<EuiBasicTableColumn<TopMessageItem>> = [
  { field: 'message', name: 'Message', truncateText: true, width: '80%' },
  { field: 'count', name: 'Count', width: '20%', align: 'right' },
];

export const TopMessagesSection = memo<{ health: HealthData }>(({ health }) => {
  const { top_errors: topErrors = [], top_warnings: topWarnings = [] } = health.stats_over_interval;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <SectionPanel title="Top Errors">
          {topErrors.length > 0 ? (
            <EuiBasicTable items={topErrors} columns={TOP_MSG_COLUMNS} compressed />
          ) : (
            <EuiText size="s" color="subdued">
              {'No errors recorded.'}
            </EuiText>
          )}
        </SectionPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <SectionPanel title="Top Warnings">
          {topWarnings.length > 0 ? (
            <EuiBasicTable items={topWarnings} columns={TOP_MSG_COLUMNS} compressed />
          ) : (
            <EuiText size="s" color="subdued">
              {'No warnings recorded.'}
            </EuiText>
          )}
        </SectionPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
TopMessagesSection.displayName = 'TopMessagesSection';
