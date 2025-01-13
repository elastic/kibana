/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { useCallback, useMemo } from 'react';
import { TableId, tableDefaults, dataTableSelectors } from '@kbn/securitysolution-data-table';
import type { RenderContext } from '@kbn/response-ops-alerts-table/types';
import type { UseDataGridColumnsSecurityCellActionsProps } from '../../../common/components/cell_actions';
import { useDataGridColumnsSecurityCellActions } from '../../../common/components/cell_actions';
import { SecurityCellActionsTrigger, SecurityCellActionType } from '../../../app/actions/constants';
import { VIEW_SELECTION } from '../../../../common/constants';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useGetFieldSpec } from '../../../common/hooks/use_get_field_spec';
import { useDataViewId } from '../../../common/hooks/use_data_view_id';
import type {
  SecurityAlertsTableContext,
  GetSecurityAlertsTableProp,
} from '../../components/alerts_table/types';

export const useCellActionsOptions = (
  tableId: TableId,
  context?: Pick<
    RenderContext<SecurityAlertsTableContext>,
    'columns' | 'oldAlertsData' | 'pageIndex' | 'pageSize' | 'dataGridRef'
  >
) => {
  const {
    columns = [],
    oldAlertsData: data = [],
    pageIndex = 0,
    pageSize = 0,
    dataGridRef,
  } = context ?? {};
  const getFieldSpec = useGetFieldSpec(SourcererScopeName.detections);
  const dataViewId = useDataViewId(SourcererScopeName.detections);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const viewMode =
    useShallowEqualSelector((state) => (getTable(state, tableId) ?? tableDefaults).viewMode) ??
    tableDefaults.viewMode;
  const cellActionsMetadata = useMemo(
    () => ({ scopeId: tableId, dataViewId }),
    [dataViewId, tableId]
  );
  const cellActionsFields: UseDataGridColumnsSecurityCellActionsProps['fields'] = useMemo(
    () =>
      viewMode === VIEW_SELECTION.eventRenderedView
        ? undefined
        : columns.map(
            (column) =>
              getFieldSpec(column.id) ?? {
                name: '',
                type: '', // When type is an empty string all cell actions are incompatible
                aggregatable: false,
                searchable: false,
              }
          ),
    [columns, getFieldSpec, viewMode]
  );

  /**
   * There is difference between how `triggers actions` fetched data v/s
   * how security solution fetches data via timelineSearchStrategy
   *
   * _id and _index fields are array in timelineSearchStrategy  but not in
   * ruleStrategy
   *
   *
   */

  const finalData = useMemo(
    () =>
      (data as TimelineNonEcsData[][]).map((row) =>
        row.map((field) => {
          let localField = field;
          if (['_id', '_index'].includes(field.field)) {
            const newValue = field.value ?? '';
            localField = {
              field: field.field,
              value: Array.isArray(newValue) ? newValue : [newValue],
            };
          }
          return localField;
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
    triggerId: SecurityCellActionsTrigger.DEFAULT,
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
