/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { AlertsTableProps, RenderContext } from '@kbn/response-ops-alerts-table/types';
import { ALERT_BUILDING_BLOCK_TYPE, AlertConsumers } from '@kbn/rule-data-utils';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { dataTableActions, dataTableSelectors, TableId } from '@kbn/securitysolution-data-table';
import type { SetOptional } from 'type-fest';
import { noop } from 'lodash';
import type { Alert } from '@kbn/alerting-types';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useAlertsContext } from './alerts_context';
import { useBulkActionsByTableType } from '../../hooks/trigger_actions_alert_table/use_bulk_actions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type {
  GetSecurityAlertsTableProp,
  SecurityAlertsTableContext,
  SecurityAlertsTableProps,
} from './types';
import { ActionsCell } from './actions_cell';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useLicense } from '../../../common/hooks/use_license';
import { APP_ID, CASES_FEATURE_ID, VIEW_SELECTION } from '../../../../common/constants';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import type { State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';
import { combineQueries } from '../../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { useSourcererDataView } from '../../../sourcerer/containers';
import type { RunTimeMappings } from '../../../sourcerer/store/model';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useKibana } from '../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { CellValue, getColumns } from '../../configurations/security_solution_detections';
import { buildTimeRangeFilter } from './helpers';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import * as i18n from './translations';
import { eventRenderedViewColumns } from '../../configurations/security_solution_detections/columns';
import { getAlertsDefaultModel } from './default_config';
import { useFetchNotes } from '../../../notes/hooks/use_fetch_notes';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { useFetchUserProfilesFromAlerts } from '../../configurations/security_solution_detections/fetch_page_context';
import { useCellActionsOptions } from '../../hooks/trigger_actions_alert_table/use_cell_actions';
import { useAlertsTableFieldsBrowserOptions } from '../../hooks/trigger_actions_alert_table/use_trigger_actions_browser_fields_options';
import { AlertTableCellContextProvider } from '../../configurations/security_solution_detections/cell_value_context';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';

const { updateIsLoading, updateTotalCount } = dataTableActions;

// we show a maximum of 6 action buttons
// - open flyout
// - investigate in timeline
// - 3-dot menu for more actions
// - add new note
// - session view
// - analyzer graph
const MAX_ACTION_BUTTON_COUNT = 6;
const DEFAULT_DATA_GRID_HEIGHT = 600;

const ALERT_TABLE_CONSUMERS: AlertsTableProps['consumers'] = [AlertConsumers.SIEM];

// Highlight rows with building block alerts
const shouldHighlightRow = (alert: Alert) => !!alert[ALERT_BUILDING_BLOCK_TYPE];

interface GridContainerProps {
  hideLastPage: boolean;
}

export const FullWidthFlexGroupTable = styled(EuiFlexGroup)`
  overflow: hidden;
  margin: 0;
  display: flex;
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

interface DetectionEngineAlertTableProps
  extends SetOptional<SecurityAlertsTableProps, 'id' | 'ruleTypeIds' | 'query'> {
  inputFilters?: Filter[];
  tableType?: TableId;
  sourcererScope?: SourcererScopeName;
  isLoading?: boolean;
  onRuleChange?: () => void;
}

const initialSort: GetSecurityAlertsTableProp<'initialSort'> = [
  {
    '@timestamp': {
      order: 'desc',
    },
  },
];
const casesConfiguration = { featureId: CASES_FEATURE_ID, owner: [APP_ID], syncAlerts: true };
const emptyInputFilters: Filter[] = [];

const DetectionEngineAlertsTableComponent: FC<Omit<DetectionEngineAlertTableProps, 'services'>> = ({
  inputFilters = emptyInputFilters,
  tableType = TableId.alertsOnAlertsPage,
  sourcererScope = SourcererScopeName.detections,
  isLoading,
  onRuleChange,
  ...tablePropsOverrides
}) => {
  const { id } = tablePropsOverrides;
  const {
    data,
    http,
    notifications,
    fieldFormats,
    application,
    licensing,
    uiSettings,
    settings,
    cases,
  } = useKibana().services;
  const { alertsTableRef } = useAlertsContext();

  const { from, to, setQuery } = useGlobalTime();

  const dispatch = useDispatch();

  const timelineID = tableType;
  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    onRuleChange,
  });
  const { browserFields: oldBrowserFields, sourcererDataView: oldSourcererDataView } =
    useSourcererDataView(sourcererScope);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView: experimentalDataView } = useDataView(sourcererScope);
  const experimentalBrowserFields = useBrowserFields(sourcererScope);
  const runtimeMappings = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataView.getRuntimeMappings()
        : (oldSourcererDataView.runtimeFieldMap as RunTimeMappings),
    [newDataViewPickerEnabled, experimentalDataView, oldSourcererDataView]
  );

  const browserFields = newDataViewPickerEnabled ? experimentalBrowserFields : oldBrowserFields;

  const license = useLicense();
  const isEnterprisePlus = license.isEnterprise();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const licenseDefaults = useMemo(() => getAlertsDefaultModel(license), [license]);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const {
    initialized: isDataTableInitialized,
    viewMode: tableView = eventsDefaultModel.viewMode,
    columns,
    totalCount: count,
  } = useSelector((state: State) => getTable(state, tableType) ?? licenseDefaults);

  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const allFilters = useMemo(() => {
    return [...inputFilters, ...(globalFilters ?? []), ...(timeRangeFilter ?? [])];
  }, [inputFilters, globalFilters, timeRangeFilter]);

  const combinedQuery = useMemo(() => {
    if (browserFields != null && (oldSourcererDataView || experimentalDataView)) {
      return combineQueries({
        config: getEsQueryConfig(uiSettings),
        dataProviders: [],
        dataViewSpec: oldSourcererDataView,
        dataView: experimentalDataView,
        browserFields,
        filters: [...allFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
      });
    }
    return null;
  }, [
    browserFields,
    oldSourcererDataView,
    uiSettings,
    experimentalDataView,
    allFilters,
    globalQuery,
  ]);

  useInvalidFilterQuery({
    id: tableType,
    filterQuery: combinedQuery?.filterQuery,
    kqlError: combinedQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const finalBoolQuery: AlertsTableProps['query'] = useMemo(() => {
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

  const { onLoad } = useFetchNotes();
  const [tableContext, setTableContext] = useState<RenderContext<SecurityAlertsTableContext>>();

  const onUpdate: GetSecurityAlertsTableProp<'onUpdate'> = useCallback(
    (context) => {
      setTableContext(context);
      dispatch(
        updateIsLoading({
          id: tableType,
          isLoading: context.isLoading ?? true,
        })
      );
      dispatch(
        updateTotalCount({
          id: tableType,
          totalCount: context.alertsCount ?? -1,
        })
      );
      setQuery({
        id: tableType,
        loading: context.isLoading ?? true,
        refetch: context.refresh ?? noop,
        inspect: null,
      });
    },
    [dispatch, setQuery, tableType]
  );
  const userProfiles = useFetchUserProfilesFromAlerts({
    alerts: tableContext?.alerts ?? [],
    columns: tableContext?.columns ?? [],
  });

  let ACTION_BUTTON_COUNT = MAX_ACTION_BUTTON_COUNT;

  // hiding the session view icon for users without enterprise plus license
  if (!isEnterprisePlus) {
    ACTION_BUTTON_COUNT--;
  }
  const {
    timelinePrivileges: { read: canReadTimelines },
    notesPrivileges: { read: canReadNotes },
  } = useUserPrivileges();

  // remove space if investigate timeline icon shouldn't be displayed
  if (!canReadTimelines) {
    ACTION_BUTTON_COUNT--;
  }

  // remove space if add notes icon shouldn't be displayed
  const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesDisabled'
  );
  if (!canReadNotes || securitySolutionNotesDisabled) {
    ACTION_BUTTON_COUNT--;
  }

  const leadingControlColumn = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT)[0],
    [ACTION_BUTTON_COUNT]
  );

  const additionalContext: SecurityAlertsTableContext = useMemo(
    () => ({
      rowRenderers: defaultRowRenderers,
      isDetails: false,
      truncate: true,
      isDraggable: false,
      leadingControlColumn,
      userProfiles,
      tableType,
      sourcererScope,
    }),
    [leadingControlColumn, sourcererScope, tableType, userProfiles]
  );

  const refreshAlertsTable = useCallback(() => {
    alertsTableRef.current?.refresh();
  }, [alertsTableRef]);

  const fieldsBrowserOptions = useAlertsTableFieldsBrowserOptions(
    SourcererScopeName.detections,
    alertsTableRef.current?.toggleColumn
  );
  const cellActionsOptions = useCellActionsOptions(tableType, tableContext);
  const bulkActions = useBulkActionsByTableType(tableType, finalBoolQuery, refreshAlertsTable);

  useEffect(() => {
    if (isDataTableInitialized) return;
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableType,
        title: i18n.SESSIONS_TITLE,
        defaultColumns: finalColumns.map((c) => ({
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...c,
        })),
      })
    );
  }, [dispatch, tableType, finalColumns, isDataTableInitialized]);

  const toolbarVisibility = useMemo(
    () => ({
      showColumnSelector: !isEventRenderedView,
      showSortSelector: !isEventRenderedView,
    }),
    [isEventRenderedView]
  );

  const services = useMemo(
    () => ({
      data,
      http,
      notifications,
      fieldFormats,
      application,
      licensing,
      settings,
      cases,
    }),
    [application, data, fieldFormats, http, licensing, notifications, settings, cases]
  );

  /**
   * if records are too less, we don't want table to be of fixed height.
   * it should shrink to the content height.
   * Height setting enables/disables virtualization depending on fixed/undefined height values respectively.
   * */
  const alertTableHeight = useMemo(
    () =>
      isEventRenderedView
        ? `${DEFAULT_DATA_GRID_HEIGHT}px`
        : /*
         * We keep fixed height in Event rendered because of the row height issue
         * as mentioned here
         */
        count > 20
        ? `${DEFAULT_DATA_GRID_HEIGHT}px`
        : undefined,
    [count, isEventRenderedView]
  );

  const onLoaded = useCallback(({ alerts }: { alerts: Alert[] }) => onLoad(alerts), [onLoad]);

  if (isLoading) {
    return null;
  }

  return (
    <FullWidthFlexGroupTable gutterSize="none">
      <StatefulEventContext.Provider value={activeStatefulEventContext}>
        <EuiDataGridContainer hideLastPage={false}>
          <AlertTableCellContextProvider
            tableId={tableType}
            sourcererScope={SourcererScopeName.detections}
          >
            <AlertsTable<SecurityAlertsTableContext>
              ref={alertsTableRef}
              // Stores separate configuration based on the view of the table
              id={id ?? `detection-engine-alert-table-${tableType}-${tableView}`}
              ruleTypeIds={SECURITY_SOLUTION_RULE_TYPE_IDS}
              consumers={ALERT_TABLE_CONSUMERS}
              query={finalBoolQuery}
              initialSort={initialSort}
              casesConfiguration={casesConfiguration}
              gridStyle={gridStyle}
              shouldHighlightRow={shouldHighlightRow}
              rowHeightsOptions={rowHeightsOptions}
              columns={finalColumns}
              browserFields={finalBrowserFields}
              onUpdate={onUpdate}
              onLoaded={onLoaded}
              additionalContext={additionalContext}
              height={alertTableHeight}
              initialPageSize={50}
              runtimeMappings={runtimeMappings}
              toolbarVisibility={toolbarVisibility}
              renderCellValue={CellValue}
              renderActionsCell={ActionsCell}
              renderAdditionalToolbarControls={
                tableType !== TableId.alertsOnCasePage ? AdditionalToolbarControls : undefined
              }
              actionsColumnWidth={leadingControlColumn.width}
              additionalBulkActions={bulkActions}
              fieldsBrowserOptions={
                tableType === TableId.alertsOnAlertsPage ||
                tableType === TableId.alertsOnRuleDetailsPage
                  ? fieldsBrowserOptions
                  : undefined
              }
              cellActionsOptions={cellActionsOptions}
              showInspectButton
              services={services}
              {...tablePropsOverrides}
            />
          </AlertTableCellContextProvider>
        </EuiDataGridContainer>
      </StatefulEventContext.Provider>
    </FullWidthFlexGroupTable>
  );
};

export const DetectionEngineAlertsTable = memo(DetectionEngineAlertsTableComponent);
