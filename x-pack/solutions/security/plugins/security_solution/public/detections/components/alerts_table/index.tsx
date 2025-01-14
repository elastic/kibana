/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import type { Alert } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ALERT_BUILDING_BLOCK_TYPE, AlertConsumers } from '@kbn/rule-data-utils';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useLicense } from '../../../common/hooks/use_license';
import { VIEW_SELECTION } from '../../../../common/constants';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import {
  useSessionView,
  useSessionViewNavigation,
} from '../../../timelines/components/timeline/tabs/session/use_session_view';
import { inputsSelectors } from '../../../common/store';
import { combineQueries } from '../../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useKibana } from '../../../common/lib/kibana';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getColumns } from '../../configurations/security_solution_detections';
import { buildTimeRangeFilter } from './helpers';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import type { State } from '../../../common/store';
import * as i18n from './translations';
import { eventRenderedViewColumns } from '../../configurations/security_solution_detections/columns';
import { getAlertsDefaultModel } from './default_config';
import { useFetchNotes } from '../../../notes/hooks/use_fetch_notes';

const { updateIsLoading, updateTotalCount } = dataTableActions;

const DEFAULT_DATA_GRID_HEIGHT = 600;

const ALERT_TABLE_CONSUMERS: AlertsTableStateProps['consumers'] = [AlertConsumers.SIEM];

// Highlight rows with building block alerts
const shouldHighlightRow = (alert: Alert) => !!alert[ALERT_BUILDING_BLOCK_TYPE];

interface GridContainerProps {
  hideLastPage: boolean;
}

export const FullWidthFlexGroupTable = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const EuiDataGridContainer = styled.div<GridContainerProps>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => {
        return `${hideLastPage ? 'display:none' : ''}`;
      }};
    }
  }
  div .euiDataGridRowCell {
    display: flex;
    align-items: center;
  }
  div .euiDataGridRowCell > [data-focus-lock-disabled] {
    display: flex;
    align-items: center;
    flex-grow: 1;
    width: 100%;
  }
  div .euiDataGridRowCell__content {
    flex-grow: 1;
  }
  div .siemEventsTable__trSupplement--summary {
    display: block;
  }
  width: 100%;
`;
interface DetectionEngineAlertTableProps {
  configId: string;
  inputFilters: Filter[];
  tableId: TableId;
  sourcererScope?: SourcererScopeName;
  isLoading?: boolean;
  onRuleChange?: () => void;
}

export const AlertsTableComponent: FC<DetectionEngineAlertTableProps> = ({
  configId,
  inputFilters,
  tableId = TableId.alertsOnAlertsPage,
  sourcererScope = SourcererScopeName.detections,
  isLoading,
  onRuleChange,
}) => {
  const { triggersActionsUi, uiSettings } = useKibana().services;

  const { from, to, setQuery } = useGlobalTime();

  const alertTableRefreshHandlerRef = useRef<(() => void) | null>(null);

  const dispatch = useDispatch();

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableId,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    onRuleChange,
  });
  const { browserFields, sourcererDataView } = useSourcererDataView(sourcererScope);
  const license = useLicense();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const isDataTableInitialized = useShallowEqualSelector(
    (state) => (getTable(state, tableId) ?? tableDefaults).initialized
  );

  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const allFilters = useMemo(() => {
    return [...inputFilters, ...(globalFilters ?? []), ...(timeRangeFilter ?? [])];
  }, [inputFilters, globalFilters, timeRangeFilter]);

  const {
    dataTable: {
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      sessionViewConfig,
      viewMode: tableView = eventsDefaultModel.viewMode,
      columns,
      totalCount: count,
    } = getAlertsDefaultModel(license),
  } = useShallowEqualSelector((state: State) => eventsViewerSelector(state, tableId));

  const combinedQuery = useMemo(() => {
    if (browserFields != null && sourcererDataView) {
      return combineQueries({
        config: getEsQueryConfig(uiSettings),
        dataProviders: [],
        indexPattern: sourcererDataView,
        browserFields,
        filters: [...allFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
      });
    }
    return null;
  }, [browserFields, globalQuery, sourcererDataView, uiSettings, allFilters]);

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: combinedQuery?.filterQuery,
    kqlError: combinedQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const finalBoolQuery: AlertsTableStateProps['query'] = useMemo(() => {
    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return { bool: {} };
    }
    return { bool: { filter: JSON.parse(combinedQuery?.filterQuery) } };
  }, [combinedQuery?.filterQuery, combinedQuery?.kqlError]);

  const isEventRenderedView = tableView === VIEW_SELECTION.eventRenderedView;

  const gridStyle = useMemo(
    () =>
      ({
        border: 'none',
        fontSize: 's',
        header: 'underline',
        stripes: isEventRenderedView,
      } as EuiDataGridStyle),
    [isEventRenderedView]
  );

  const rowHeightsOptions: EuiDataGridRowHeightsOptions | undefined = useMemo(() => {
    if (isEventRenderedView) {
      return {
        defaultHeight: 'auto',
      };
    }
    return undefined;
  }, [isEventRenderedView]);

  const alertColumns = useMemo(
    () => (columns.length ? columns : getColumns(license)),
    [columns, license]
  );

  const finalBrowserFields = useMemo(
    () => (isEventRenderedView ? {} : browserFields),
    [isEventRenderedView, browserFields]
  );

  const finalColumns = useMemo(
    () => (isEventRenderedView ? eventRenderedViewColumns : alertColumns),
    [alertColumns, isEventRenderedView]
  );

  const onAlertTableUpdate = useCallback<NonNullable<AlertsTableStateProps['onUpdate']>>(
    ({ isLoading: isAlertTableLoading, totalCount, refresh }) => {
      dispatch(
        updateIsLoading({
          id: tableId,
          isLoading: isAlertTableLoading,
        })
      );

      dispatch(
        updateTotalCount({
          id: tableId,
          totalCount,
        })
      );

      alertTableRefreshHandlerRef.current = refresh;

      // setting Query
      setQuery({
        id: tableId,
        loading: isAlertTableLoading,
        refetch: refresh,
        inspect: null,
      });
    },
    [dispatch, tableId, alertTableRefreshHandlerRef, setQuery]
  );

  const cellContext = useMemo(() => {
    return {
      rowRenderers: defaultRowRenderers,
      isDetails: false,
      truncate: true,
      isDraggable: false,
    };
  }, []);

  const { onLoad } = useFetchNotes();

  const toolbarVisibility = useMemo(() => {
    return {
      showColumnSelector: !isEventRenderedView,
      showSortSelector: !isEventRenderedView,
    };
  }, [isEventRenderedView]);

  const alertStateProps: AlertsTableStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      // stores separate configuration based on the view of the table
      id: `detection-engine-alert-table-${configId}-${tableView}`,
      ruleTypeIds: SECURITY_SOLUTION_RULE_TYPE_IDS,
      consumers: ALERT_TABLE_CONSUMERS,
      query: finalBoolQuery,
      gridStyle,
      shouldHighlightRow,
      rowHeightsOptions,
      columns: finalColumns,
      browserFields: finalBrowserFields,
      onUpdate: onAlertTableUpdate,
      cellContext,
      onLoaded: onLoad,
      toolbarVisibility,
      // if records are too less, we don't want table to be of fixed height.
      // it should shrink to the content height.
      // Height setting enables/disables virtualization depending on fixed/undefined height values respectively.
      height: count >= 20 ? `${DEFAULT_DATA_GRID_HEIGHT}px` : undefined,
      initialPageSize: 50,
      runtimeMappings: sourcererDataView.runtimeFieldMap as RunTimeMappings,
    }),
    [
      triggersActionsUi.alertsTableConfigurationRegistry,
      configId,
      tableView,
      finalBoolQuery,
      gridStyle,
      rowHeightsOptions,
      finalColumns,
      finalBrowserFields,
      onAlertTableUpdate,
      cellContext,
      onLoad,
      toolbarVisibility,
      count,
      sourcererDataView.runtimeFieldMap,
    ]
  );

  useEffect(() => {
    if (isDataTableInitialized) return;
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableId,
        title: i18n.SESSIONS_TITLE,
        defaultColumns: finalColumns.map((c) => ({
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...c,
        })),
      })
    );
  }, [dispatch, tableId, finalColumns, isDataTableInitialized]);

  const AlertTable = useMemo(
    () => triggersActionsUi.getAlertsStateTable(alertStateProps),
    [alertStateProps, triggersActionsUi]
  );

  const { Navigation } = useSessionViewNavigation({
    scopeId: tableId,
  });

  const { SessionView } = useSessionView({
    scopeId: tableId,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableId} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableId, sessionViewConfig, SessionView, Navigation]);

  if (isLoading) {
    return null;
  }

  return (
    <div>
      {graphOverlay}
      <FullWidthFlexGroupTable $visible={!graphEventId && graphOverlay == null} gutterSize="none">
        <StatefulEventContext.Provider value={activeStatefulEventContext}>
          <EuiDataGridContainer hideLastPage={false}>{AlertTable}</EuiDataGridContainer>
        </StatefulEventContext.Provider>
      </FullWidthFlexGroupTable>
    </div>
  );
};
