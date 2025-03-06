/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type {
  CustomCellRenderer,
  CustomGridColumnProps,
  CustomGridColumnsConfiguration,
} from '@kbn/unified-data-table';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  DataTableRecord,
  RowControlColumn,
  RowControlComponent,
  RowControlRowProps,
} from '@kbn/discover-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Filter } from '@kbn/es-query';
import { KibanaAlertRelatedIntegrationCellRenderer } from '../cell_renderers/kibana_alert_related_integration';
import { RELATED_INTEGRATION, RULE_NAME, SEVERITY, TIMESTAMP } from '../constants/fields';
import type { ESQuery } from '../../../../../common/typed_json';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useTimelineEvents } from '../../../../timelines/containers';
import { EmptyComponent } from '../../../../common/lib/cell_actions/helpers';
import { MoreActionsRowControlColumn } from '../leading_controls/more_actions';
import { AssistantRowControlColumn } from '../leading_controls/assistant';
import {
  RELATION_INTEGRATION_COLUMN,
  RULE_NAME_COLUMN,
  SEVERITY_COLUMN,
  TIMESTAMP_COLUMN,
} from './translations';
import { KibanaAlertSeverityCellRenderer } from '../cell_renderers/kibana_alert_severity';
import { COLUMN_IDS, SAMPLE_SIZE } from './grouped_table';
import { transformTimelineItemToUnifiedRows } from '../../../../timelines/components/timeline/unified_components/utils';
import { useKibana } from '../../../../common/lib/kibana';
import { IOCPanelKey } from '../../../../flyout/ai_for_soc/constants/panel_keys';

/**
 *
 */
const rowsPerPageOptions = [10, 25, 50, 100];

/**
 *
 */
const customGridColumnsConfiguration: CustomGridColumnsConfiguration = {
  [TIMESTAMP]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: TIMESTAMP_COLUMN,
    initialWidth: 225,
  }),
  [RELATED_INTEGRATION]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: RELATION_INTEGRATION_COLUMN,
  }),
  [SEVERITY]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: SEVERITY_COLUMN,
    initialWidth: 125,
  }),
  [RULE_NAME]: (props: CustomGridColumnProps) => ({
    ...props.column,
    displayAsText: RULE_NAME_COLUMN,
  }),
};

export interface TableProps {
  /**
   *
   */
  dataView: DataView;
  /**
   *
   */
  groupingFilters: Filter[];
}

/**
 *
 */
export const Table = memo(({ dataView, groupingFilters }: TableProps) => {
  const indexNames = dataView.getIndexPattern();
  const { to, from } = useGlobalTime();

  const filterQuery: ESQuery | string = useMemo(
    () => (groupingFilters.length === 0 ? '' : groupingFilters[groupingFilters.length - 1].query),
    [groupingFilters]
  );

  const [loadingState, { events, totalCount }] = useTimelineEvents({
    dataViewId: dataView.id as string,
    endDate: to,
    fields: COLUMN_IDS,
    filterQuery,
    id: 'alert-summary',
    indexNames: [indexNames],
    limit: SAMPLE_SIZE,
    runtimeMappings: undefined,
    startDate: from,
  });

  const onSetColumns = useCallback(() => window.alert('onSetColumns'), []);
  const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(rowsPerPageOptions[1]);
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();

  const { tableRows: rows } = useMemo(
    () => transformTimelineItemToUnifiedRows({ events, dataView }),
    [events, dataView]
  );

  const onUpdateRowsPerPage = useCallback((r) => setRowsPerPage(r), []);

  const {
    services: {
      uiSettings,
      fieldFormats,
      storage,
      dataViewFieldEditor,
      notifications: { toasts: toastsService },
      theme,
      data: dataPluginContract,
    },
  } = useKibana();
  const services = useMemo(
    () => ({
      theme,
      fieldFormats,
      storage,
      toastNotifications: toastsService,
      uiSettings,
      dataViewFieldEditor,
      data: dataPluginContract,
    }),
    [
      theme,
      fieldFormats,
      storage,
      toastsService,
      uiSettings,
      dataViewFieldEditor,
      dataPluginContract,
    ]
  );

  const externalCustomRenderers: CustomCellRenderer = {
    [RELATED_INTEGRATION]: (e) => (
      <KibanaAlertRelatedIntegrationCellRenderer value={e.row.flattened[e.columnId]} />
    ),
    [SEVERITY]: (e) => <KibanaAlertSeverityCellRenderer value={e.row.flattened[e.columnId]} />,
  };

  const rowAdditionalLeadingControls: RowControlColumn[] = useMemo(
    () => [
      {
        id: '',
        headerAriaLabel: '',
        renderControl: (Control: RowControlComponent, props: RowControlRowProps) => (
          <AssistantRowControlColumn />
        ),
      },
      {
        id: '',
        headerAriaLabel: '',
        renderControl: (Control: RowControlComponent, props: RowControlRowProps) => (
          <MoreActionsRowControlColumn ecs={props.record.ecs} />
        ),
      },
    ],
    []
  );

  const { openFlyout } = useExpandableFlyoutApi();
  const onSetExpandedDoc = useCallback(
    (doc: DataTableRecord | undefined) => {
      if (doc) {
        setExpandedDoc(doc);
        openFlyout({
          right: {
            id: IOCPanelKey,
            params: {
              doc,
            },
          },
        });
      } else {
        setExpandedDoc(undefined);
      }
    },
    [openFlyout]
  );

  return (
    <UnifiedDataTable
      ariaLabelledBy=""
      columns={COLUMN_IDS}
      configRowHeight={2}
      customGridColumnsConfiguration={customGridColumnsConfiguration}
      dataView={dataView}
      expandedDoc={expandedDoc}
      externalCustomRenderers={externalCustomRenderers}
      isSortEnabled={false}
      loadingState={loadingState}
      onSetColumns={onSetColumns}
      onUpdateRowsPerPage={onUpdateRowsPerPage}
      renderDocumentView={EmptyComponent}
      rowAdditionalLeadingControls={rowAdditionalLeadingControls}
      rows={rows}
      rowsPerPageOptions={rowsPerPageOptions}
      rowsPerPageState={rowsPerPage}
      showTimeCol={showTimeCol}
      sort={[]}
      sampleSizeState={SAMPLE_SIZE}
      services={services}
      setExpandedDoc={onSetExpandedDoc}
      showFullScreenButton={false}
      showKeyboardShortcuts={false}
      totalHits={totalCount}
    />
  );
});

Table.displayName = 'Table';
