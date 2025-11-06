/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiInMemoryTable, EuiInMemoryTableProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, VFC } from 'react';
import { Indicator } from '../../../../../common/types/indicator';
import { IndicatorFieldValue } from '../common/field_value';
import { IndicatorValueActions } from './indicator_value_actions';
import { unwrapValue } from '../../utils/unwrap_value';

interface TableItem {
  key: string;
  value: string | string[] | null;
}
export interface IndicatorFieldsTableProps {
  fields: string[];
  indicator: Indicator;
  search: EuiInMemoryTableProps['search'];
  ['data-test-subj']?: string;
  compressed?: boolean;
}

export const IndicatorFieldsTable: VFC<IndicatorFieldsTableProps> = ({
  fields,
  indicator,
  'data-test-subj': dataTestSubj,
}) => {
  const columns = useMemo(
    () =>
      [
        {
          name: (
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.fieldsTable.fieldColumnLabel"
              defaultMessage="Field"
            />
          ),
          render: (field: string) => field,
        },
        {
          name: (
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.fieldsTable.valueColumnLabel"
              defaultMessage="Value"
            />
          ),
          render: (field: string) => <IndicatorFieldValue indicator={indicator} field={field} />,
        },
        {
          actions: [
            {
              render: (field: string) => (
                <IndicatorValueActions
                  field={field}
                  indicator={indicator}
                  data-test-subj={dataTestSubj}
                />
              ),
              width: '72px',
            },
          ],
        },
        // @ts-expect-error - EuiBasicTable wants an array of objects, but will accept strings if coerced
      ] as Array<EuiBasicTableColumn<string>>,
    [indicator, dataTestSubj]
  );

  const items = useMemo(() => {
    return fields.toSorted().reduce<TableItem[]>((acc, field) => {
      const value = unwrapValue(indicator, field);
      return [
        ...acc,
        {
          key: field,
          value,
        },
      ];
    }, []);
  }, [fields, indicator]);

  return (
    <EuiInMemoryTable
      items={items}
      // @ts-expect-error - EuiInMemoryTable wants an array of objects, but will accept strings if coerced
      columns={columns}
      sorting={true}
      data-test-subj={dataTestSubj}
    />
  );
};
