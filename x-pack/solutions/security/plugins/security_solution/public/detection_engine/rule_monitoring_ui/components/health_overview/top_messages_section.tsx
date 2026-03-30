/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiBasicTable, EuiText } from '@elastic/eui';
import { SectionPanel } from '../section_panel';
import type { HealthData } from './types';
import * as i18n from './translations';

interface TopMessageItem {
  message: string;
  count: number;
}

const TOP_MSG_COLUMNS: Array<EuiBasicTableColumn<TopMessageItem>> = [
  { field: 'message', name: i18n.MESSAGE_COLUMN, truncateText: true, width: '80%' },
  { field: 'count', name: i18n.COUNT_COLUMN, width: '20%', align: 'right' },
];

export const TopMessagesSection = memo(function TopMessagesSection({
  health,
}: {
  health: HealthData;
}) {
  const { top_errors: topErrors = [], top_warnings: topWarnings = [] } = health.stats_over_interval;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <SectionPanel title={i18n.TOP_ERRORS_TITLE}>
          {topErrors.length > 0 ? (
            <EuiBasicTable items={topErrors} columns={TOP_MSG_COLUMNS} compressed />
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.NO_ERRORS_RECORDED}
            </EuiText>
          )}
        </SectionPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <SectionPanel title={i18n.TOP_WARNINGS_TITLE}>
          {topWarnings.length > 0 ? (
            <EuiBasicTable items={topWarnings} columns={TOP_MSG_COLUMNS} compressed />
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.NO_WARNINGS_RECORDED}
            </EuiText>
          )}
        </SectionPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
