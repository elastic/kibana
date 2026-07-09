/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { Alert } from '@kbn/alerting-types';
import type { RenderContext } from '@kbn/response-ops-alerts-table/types';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../data_view_manager/constants';
import type { UseDataGridColumnsSecurityCellActionsProps } from '../../../common/components/cell_actions';
import { useDataGridColumnsSecurityCellActions } from '../../../common/components/cell_actions';
import { SecurityCellActionType } from '../../../app/actions/constants';
import type {
  GetSecurityAlertsTableProp,
  SecurityAlertsTableContext,
} from '../../components/alerts_table/types';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';

export const useCellActionsOptions = (
  tableId: TableId,
  context?: Pick<
    RenderContext<SecurityAlertsTableContext>,
    'columns' | 'alerts' | 'pageIndex' | 'pageSize' | 'dataGridRef'
  >
) => {
  const { dataView } = useDataView(PageScope.alerts);

  const {
    columns = [],
    alerts: data = [],
    pageIndex = 0,
    pageSize = 0,
    dataGridRef,
  } = context ?? {};
  const dataViewId = dataView.id;

  const cellActionsMetadata = useMemo(
    () => ({ scopeId: tableId, dataViewId }),
    [dataViewId, tableId]
  );
  const cellActionsFields: UseDataGridColumnsSecurityCellActionsProps['fields'] = useMemo(
    () =>
      columns.map(
        (column) =>
          dataView.fields?.getByName(column.id)?.toSpec() ?? {
            name: '',
            type: '',
            aggregatable: false,
            searchable: false,
          }
      ),
    [columns, dataView.fields]
  );

  const finalData = useMemo(
    () =>
      (data as Alert[]).map((alert) =>
        Object.entries(alert).map(([field, value]) => {
          if (['_id', '_index'].includes(field)) {
            const strValue = (value as string) ?? '';
            return {
              field,
              value: [strValue],
            };
          }
          const arrValue = Array.isArray(value)
            ? (value as string[])
            : value != null
            ? [String(value)]
            : [];
          return { field, value: arrValue };
        })
      ),
    [data]
  );

  const getCellValue = useCallback<UseDataGridColumnsSecurityCellActionsProps['getCellValue']>(
    (fieldName, rowIndex) => {
      const pageRowIndex = rowIndex - pageSize * pageIndex;
      return finalData[pageRowIndex]?.find((rowData) => rowData.field === fieldName)?.value ?? [];
    },
    [finalData, pageIndex, pageSize]
  );

  const disabledActionTypes =
    tableId === TableId.alertsOnCasePage ? [SecurityCellActionType.FILTER] : undefined;

  const cellActions = useDataGridColumnsSecurityCellActions({
    triggerId: SECURITY_CELL_ACTIONS_DEFAULT,
    fields: cellActionsFields,
    getCellValue,
    metadata: cellActionsMetadata,
    dataGridRef,
    disabledActionTypes,
  });

  return useMemo<GetSecurityAlertsTableProp<'cellActionsOptions'>>(() => {
    return {
      getCellActionsForColumn: (_columnId: string, columnIndex: number) => {
        if (cellActions.length === 0) return [];
        return cellActions[columnIndex];
      },
      visibleCellActions: 3,
    };
  }, [cellActions]);
};
