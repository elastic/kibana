/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import { EuiInMemoryTable, useEuiFontSize } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorFieldValue } from '../common/field_value';
import { unwrapValue } from '../../utils/unwrap_value';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
} from '../../../../../common/components/cell_actions';

const euiTableSearchOptions: EuiSearchBarProps = {
  box: {
    schema: true,
    incremental: true,
  },
};

interface TableItem {
  key: string;
  value: string | null;
}
export interface IndicatorFieldsTableProps {
  fields: string[];
  indicator: Indicator;
  ['data-test-subj']?: string;
  compressed?: boolean;
}

export const IndicatorFieldsTable: FC<IndicatorFieldsTableProps> = ({
  fields,
  indicator,
  'data-test-subj': dataTestSubj,
  compressed,
}) => {
  const smallFontSize = useEuiFontSize('xs').fontSize;
  const columns = useMemo(
    () =>
      [
        {
          name: (
            <FormattedMessage
              id="xpack.securitySolution.threatIntelligence.indicator.fieldsTable.fieldColumnLabel"
              defaultMessage="Field"
            />
          ),
          render: (item: TableItem) => item.key,
          width: '30%',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.securitySolution.threatIntelligence.indicator.fieldsTable.valueColumnLabel"
              defaultMessage="Value"
            />
          ),
          render: (item: TableItem) => (
            <SecurityCellActions
              data={{ field: item.key, value: item.value }}
              mode={CellActionsMode.HOVER_DOWN}
              triggerId={SecurityCellActionsTrigger.DEFAULT}
            >
              <IndicatorFieldValue indicator={indicator} field={item.key} />
            </SecurityCellActions>
          ),
          width: '70%',
        },
      ] as Array<EuiBasicTableColumn<TableItem>>,
    [indicator]
  );

  const items = useMemo(() => {
    return fields.toSorted().reduce<TableItem[]>((acc, field) => {
      return [
        ...acc,
        {
          key: field,
          value: unwrapValue(indicator, field),
        },
      ];
    }, []);
  }, [fields, indicator]);

  return (
    <EuiInMemoryTable
      items={items}
      columns={columns}
      sorting={true}
      data-test-subj={dataTestSubj}
      css={css`
        .euiTableRow {
          font-size: ${smallFontSize};
        }
      `}
      search={euiTableSearchOptions}
      compressed={compressed}
    />
  );
};
