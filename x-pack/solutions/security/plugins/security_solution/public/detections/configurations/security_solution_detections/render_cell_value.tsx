/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, type ComponentProps, useContext } from 'react';
import { EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find, getOr } from 'lodash/fp';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';

import { SIGNAL_RULE_NAME_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

import { SUPPRESSED_ALERT_TOOLTIP } from './translations';
import type { GetSecurityAlertsTableProp } from '../../components/alerts_table/types';
import type { CellValueElementProps, ColumnHeaderOptions } from '../../../../common/types';
import { AlertTableCellContext } from './cell_value_context';

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

export type RenderCellValueProps = Pick<
  ComponentProps<GetSecurityAlertsTableProp<'renderCellValue'>>,
  | 'columnId'
  | 'rowIndex'
  | 'tableId'
  | 'tableType'
  | 'legacyAlert'
  | 'ecsAlert'
  | 'rowRenderers'
  | 'isDetails'
  | 'isExpandable'
  | 'isExpanded'
  | 'colIndex'
  | 'setCellProps'
  | 'truncate'
  | 'pageScope'
  | 'userProfiles'
> &
  Partial<Omit<CellValueElementProps, 'browserFields'>>;

export const CellValue = memo(function RenderCellValue({
  columnId,
  rowIndex,
  pageScope,
  tableId,
  tableType,
  header,
  legacyAlert,
  ecsAlert,
  linkValues,
  rowRenderers,
  isDetails,
  isExpandable,
  isExpanded,
  colIndex,
  eventId,
  setCellProps,
  truncate,
  userProfiles,
}: RenderCellValueProps) {
  const { notifications } = useKibana().services;

  const cellValueContext = useContext(AlertTableCellContext);

  if (!cellValueContext) {
    const contextMissingError = new Error(
      'render_cell_value.tsx: CellValue must be used within AlertTableCellContextProvider'
    );

    notifications.toasts.addError(contextMissingError, {
      title: 'AlertTableCellContextProvider is missing',
      toastMessage: 'CellValue must be used within AlertTableCellContextProvider',
    });
    throw new Error(contextMissingError.message);
  }

  const { browserFields, browserFieldsByName, columnHeaders } = cellValueContext;
  /**
   * There is difference between how `triggers actions` fetched data v/s
   * how security solution fetches data via timelineSearchStrategy
   *
   * _id and _index fields are array in timelineSearchStrategy  but not in
   * ruleStrategy
   *
   *
   */

  const finalData = useMemo(() => {
    return (legacyAlert as TimelineNonEcsData[]).map((field) => {
      if (['_id', '_index'].includes(field.field)) {
        const newValue = field.value ?? '';
        return {
          field: field.field,
          value: Array.isArray(newValue) ? newValue : [newValue],
        };
      } else {
        return field;
      }
    });
  }, [legacyAlert]);

  const actualSuppressionCount = useMemo(() => {
    // We check both ecsAlert and data for the suppression count because it could be in either one,
    // depending on where RenderCellValue is being used - when used in cases, data is populated,
    // whereas in the regular security alerts table it's in ecsAlert
    const ecsSuppressionCount = ecsAlert?.kibana?.alert.suppression?.docs_count?.[0];
    const dataSuppressionCount = find({ field: 'kibana.alert.suppression.docs_count' }, legacyAlert)
      ?.value?.[0] as number | undefined;
    return ecsSuppressionCount ? parseInt(ecsSuppressionCount, 10) : dataSuppressionCount;
  }, [ecsAlert, legacyAlert]);

  const myHeader = useMemo(
    () => header ?? ({ id: columnId, ...browserFieldsByName[columnId] } as ColumnHeaderOptions),
    [browserFieldsByName, columnId, header]
  );

  const colHeader = useMemo(
    () => columnHeaders.find((col) => col.id === columnId),
    [columnHeaders, columnId]
  );
  const localLinkValues = useMemo(
    () => getOr([], colHeader?.linkField ?? '', ecsAlert),
    [colHeader?.linkField, ecsAlert]
  );

  const CellRenderer = useMemo(() => {
    return (
      <DefaultCellRenderer
        browserFields={browserFields}
        columnId={columnId}
        data={finalData}
        ecsData={ecsAlert}
        eventId={eventId}
        header={myHeader}
        isDetails={isDetails}
        isExpandable={isExpandable}
        isExpanded={isExpanded}
        linkValues={linkValues ?? localLinkValues}
        rowIndex={rowIndex}
        colIndex={colIndex}
        rowRenderers={rowRenderers ?? defaultRowRenderers}
        setCellProps={setCellProps}
        scopeId={pageScope}
        truncate={truncate}
        asPlainText={false}
        context={userProfiles}
      />
    );
  }, [
    browserFields,
    columnId,
    finalData,
    ecsAlert,
    eventId,
    myHeader,
    isDetails,
    isExpandable,
    isExpanded,
    linkValues,
    localLinkValues,
    rowIndex,
    colIndex,
    rowRenderers,
    setCellProps,
    pageScope,
    truncate,
    userProfiles,
  ]);

  return columnId === SIGNAL_RULE_NAME_FIELD_NAME && actualSuppressionCount ? (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={SUPPRESSED_ALERT_TOOLTIP(actualSuppressionCount)}
          position="top"
          type="layers"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{CellRenderer}</EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <>{CellRenderer}</>
  );
});
