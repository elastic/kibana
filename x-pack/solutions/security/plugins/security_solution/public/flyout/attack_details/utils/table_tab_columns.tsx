/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

export const FIELD = i18n.translate(
  'xpack.securitySolution.attackDetailsFlyout.table.fieldCellLabel',
  {
    defaultMessage: 'Field',
  }
);
const VALUE = i18n.translate('xpack.securitySolution.attackDetailsFlyout.table.valueCellLabel', {
  defaultMessage: 'Value',
});

export type ColumnsProvider = () => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

/**
 * Returns the columns for the table tab
 */
export const getTableTabColumns: ColumnsProvider = () => [
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>{FIELD}</strong>
      </EuiText>
    ),
    width: '30%',
    render: (field, data) => {
      return <EuiText size="xs">{field}</EuiText>;
    },
  },
  {
    field: 'values',
    name: (
      <EuiText size="xs">
        <strong>{VALUE}</strong>
      </EuiText>
    ),
    render: (values, data) => {
      return <EuiText size="xs">{values}</EuiText>;
    },
  },
];
