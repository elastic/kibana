/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText, type EuiBasicTableColumn } from '@elastic/eui';

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { TableFieldNameCell } from '../../document_details/right/components/table_field_name_cell';
import { getFieldFromBrowserField } from '../../document_details/right/tabs/table_tab';
import { TableFieldValueCell } from '../components/table_field_value_cell';

export const FIELD = i18n.translate(
  'xpack.securitySolution.attackDetailsFlyout.table.fieldCellLabel',
  {
    defaultMessage: 'Field',
  }
);
const VALUE = i18n.translate('xpack.securitySolution.attackDetailsFlyout.table.valueCellLabel', {
  defaultMessage: 'Value',
});

export type ColumnsProvider = (providerOptions: {
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * Id of the attack document
   */
  attackId: string;
}) => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

/**
 * Returns the columns for the table tab
 */
export const getTableTabColumns: ColumnsProvider = ({ browserFields, attackId }) => [
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>{FIELD}</strong>
      </EuiText>
    ),
    width: '30%',
    render: (field, data) => {
      return <TableFieldNameCell dataType={(data as EventFieldsData).type} field={field} />;
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
      const fieldFromBrowserField = getFieldFromBrowserField(data.field, browserFields);

      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <TableFieldValueCell
              data={data as EventFieldsData}
              attackId={attackId}
              fieldFromBrowserField={fieldFromBrowserField}
              values={values}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  },
];
