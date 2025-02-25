/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, type ComponentProps } from 'react';
import { EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find, getOr } from 'lodash/fp';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { tableDefaults, dataTableSelectors } from '@kbn/securitysolution-data-table';
import { useLicense } from '../../../common/hooks/use_license';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { GuidedOnboardingTourStep } from '../../../common/components/guided_onboarding_tour/tour_step';
import { isDetectionsAlertsTable } from '../../../common/components/top_n/helpers';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../../common/components/guided_onboarding_tour/tour_config';
import { SIGNAL_RULE_NAME_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

import { SUPPRESSED_ALERT_TOOLTIP } from './translations';
import { VIEW_SELECTION } from '../../../../common/constants';
import { getAllFieldsByName } from '../../../common/containers/source';
import { eventRenderedViewColumns, getColumns } from './columns';
import type { GetSecurityAlertsTableProp } from '../../components/alerts_table/types';
import type { CellValueElementProps, ColumnHeaderOptions } from '../../../../common/types';

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

type RenderCellValueProps = Pick<
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
  | 'sourcererScope'
  | 'userProfiles'
> &
  Partial<Omit<CellValueElementProps, 'browserFields'>>;

export const CellValue = memo(function RenderCellValue({
  columnId,
  rowIndex,
  sourcererScope,
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
  const isTourAnchor = useMemo(
    () =>
      columnId === SIGNAL_RULE_NAME_FIELD_NAME &&
      isDetectionsAlertsTable(tableType) &&
      rowIndex === 0 &&
      !isDetails,
    [columnId, isDetails, rowIndex, tableType]
  );
  const { browserFields } = useSourcererDataView(sourcererScope);
  const browserFieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const license = useLicense();
  const viewMode =
    useDeepEqualSelector((state) => (getTable(state, tableId ?? '') ?? tableDefaults).viewMode) ??
    tableDefaults.viewMode;

  const gridColumns = useMemo(() => {
    return getColumns(license);
  }, [license]);

  const columnHeaders = useMemo(() => {
    return viewMode === VIEW_SELECTION.gridView ? gridColumns : eventRenderedViewColumns;
  }, [gridColumns, viewMode]);

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

  const Renderer = useMemo(() => {
    const myHeader =
      header ?? ({ id: columnId, ...browserFieldsByName[columnId] } as ColumnHeaderOptions);
    const colHeader = columnHeaders.find((col) => col.id === columnId);
    const localLinkValues = getOr([], colHeader?.linkField ?? '', ecsAlert);
    return (
      <GuidedOnboardingTourStep
        isTourAnchor={isTourAnchor}
        step={AlertsCasesTourSteps.pointToAlertName}
        tourId={SecurityStepId.alertsCases}
      >
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
          scopeId={sourcererScope}
          truncate={truncate}
          asPlainText={false}
          context={userProfiles}
        />
      </GuidedOnboardingTourStep>
    );
  }, [
    header,
    columnId,
    browserFieldsByName,
    columnHeaders,
    ecsAlert,
    isTourAnchor,
    browserFields,
    finalData,
    eventId,
    isDetails,

    isExpandable,
    isExpanded,
    linkValues,
    rowIndex,
    colIndex,
    rowRenderers,
    setCellProps,
    sourcererScope,
    truncate,
    userProfiles,
  ]);

  return columnId === SIGNAL_RULE_NAME_FIELD_NAME && actualSuppressionCount ? (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={SUPPRESSED_ALERT_TOOLTIP(actualSuppressionCount)}>
          <EuiIcon type="layers" />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{Renderer}</EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <>{Renderer}</>
  );
});
