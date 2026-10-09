/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { type EuiBasicTableColumn, EuiText } from '@elastic/eui';

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { TableFieldNameCell } from '../../../shared/components/table_field_name_cell';
import { getFieldFromBrowserField } from '../../../document/main/tabs/table_tab';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
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
  /**
   * Scope the cell actions are rendered for (drives the sourcerer scope and metadata)
   */
  scopeId: string;
  /**
   * Wraps each value cell with cell actions (filter for/out, copy, etc.). The caller decides
   * what to inject (real security cell actions in Security Solution, no-op elsewhere).
   */
  renderCellActions: CellActionRenderer;
}) => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

/**
 * Returns the columns for the table tab
 */
export const getTableTabColumns: ColumnsProvider = ({
  browserFields,
  attackId,
  scopeId,
  renderCellActions,
}) => [
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

      return renderCellActions({
        field: data.field,
        value: values,
        scopeId,
        children: (
          <TableFieldValueCell
            data={data as EventFieldsData}
            attackId={attackId}
            fieldFromBrowserField={fieldFromBrowserField}
            values={values}
          />
        ),
      });
    },
  },
];
