/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// No bueno, I know! Encountered when reverting RBAC work post initial BCs
// Don't want to include large amounts of refactor in this temporary workaround
// TODO: Refactor code - component can be broken apart
import {
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiWindowEvent,
  EuiHorizontalRule,
  EuiFlexItem,
} from '@elastic/eui';
import styled from 'styled-components';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';
import { isTab } from '@kbn/timelines-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { DocLinks } from '@kbn/doc-links';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { isEqual } from 'lodash';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { DetectionEngineFilters } from '../../components/detection_engine_filters/detection_engine_filters';
import { FilterByAssigneesPopover } from '../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover';
import type { AssigneesIdsSelection } from '../../../common/components/assignees/types';
import { useDataTableFilters } from '../../../common/hooks/use_data_table_filters';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { SecurityPageName } from '../../../app/types';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { getRulesUrl } from '../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { inputsSelectors } from '../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { NoApiIntegrationKeyCallOut } from '../../components/callouts/no_api_integration_callout';
import { useUserData } from '../../components/user_info';
import { DetectionEngineNoIndex } from './detection_engine_no_index';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { useFormatUrl } from '../../../common/components/link_to';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../timelines/components/timeline/helpers';
import {
  buildAlertAssigneesFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../components/alerts_table/default_config';
import { ChartPanels } from '../../components/alerts_kpis/chart_panels';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useSignalHelpers } from '../../../sourcerer/containers/use_signal_helpers';

import { SourcererScopeName } from '../../../sourcerer/store/model';
import { NeedAdminForUpdateRulesCallOut } from '../../components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../components/callouts/missing_privileges_callout';
import { useKibana } from '../../../common/lib/kibana';
import { NoPrivileges } from '../../../common/components/no_privileges';
import { HeaderPage } from '../../../common/components/header_page';
import { EmptyPrompt } from '../../../common/components/empty_prompt';
import type { Status } from '../../../../common/api/detection_engine';
import { GroupedAlertsTable } from '../../components/alerts_table/alerts_grouping';
import { DetectionEngineAlertsTable } from '../../components/alerts_table';
import type { AddFilterProps } from '../../components/alerts_kpis/common/types';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

type DetectionEngineComponentProps = PropsFromRedux;

const DetectionEnginePageComponent: React.FC<DetectionEngineComponentProps> = () => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).graphEventId
  );

  const isTableLoading = useShallowEqualSelector(
    (state) => (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).isLoading
  );

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const [
    {
      loading: userInfoLoading,
      isAuthenticated: isUserAuthenticated,
      hasEncryptionKey,
      signalIndexName,
      canUserREAD,
      hasIndexRead,
      hasIndexWrite,
      hasIndexMaintenance,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();

  const [assignees, setAssignees] = useState<AssigneesIdsSelection[]>([]);
  const handleSelectedAssignees = useCallback(
    (newAssignees: AssigneesIdsSelection[]) => {
      if (!isEqual(newAssignees, assignees)) {
        setAssignees(newAssignees);
      }
    },
    [assignees]
  );

  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const [detectionPageFilters, setDetectionPageFilters] = useState<Filter[]>();
  const [detectionPageFilterHandler, setDetectionPageFilterHandler] = useState<
    FilterGroupHandler | undefined
  >();

  const { sourcererDataView, loading: isLoadingIndexPattern } = useSourcererDataView(
    SourcererScopeName.detections
  );

  const { formatUrl } = useFormatUrl(SecurityPageName.rules);

  const { showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } = useDataTableFilters(
    TableId.alertsOnAlertsPage
  );

  const loading = userInfoLoading || listsConfigLoading;
  const {
    application: { navigateToUrl },
    data,
  } = useKibana().services;

  const { filterManager } = data.query;

  const topLevelFilters = useMemo(() => {
    return [
      ...filters,
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ...buildAlertAssigneesFilter(assignees),
    ];
  }, [assignees, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, filters]);

  useEffect(() => {
    if (!detectionPageFilterHandler) return;
    // if Alert is reloaded because of action by the user.
    // We want reload the values in the detection Page filters
    if (!isTableLoading) detectionPageFilterHandler.reload();
  }, [isTableLoading, detectionPageFilterHandler]);

  const addFilter = useCallback(
    ({ field, value, negate }: AddFilterProps) => {
      filterManager.addFilters([
        {
          meta: {
            alias: null,
            disabled: false,
            negate: negate ?? false,
          },
          ...(value != null
            ? { query: { match_phrase: { [field]: value } } }
            : { exists: { field } }),
        },
      ]);
    },
    [filterManager]
  );

  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch]
  );

  const goToRules = useCallback(
    (ev: React.MouseEvent) => {
      ev.preventDefault();
      navigateToUrl(formatUrl(getRulesUrl()));
    },
    [formatUrl, navigateToUrl]
  );

  const alertsDefaultFilters = useMemo(
    () => [...topLevelFilters, ...(detectionPageFilters ?? [])],
    [topLevelFilters, detectionPageFilters]
  );

  // AlertsTable manages global filters itself, so not including `filters`
  const alertsTableDefaultFilters = useMemo(
    () => [
      ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
      ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ...(detectionPageFilters ?? []),
      ...buildAlertAssigneesFilter(assignees),
    ],
    [assignees, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, detectionPageFilters]
  );

  const { signalIndexNeedsInit, pollForSignalIndex } = useSignalHelpers();

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    focusUtilityBarAction(containerElement.current);
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    resetKeyboardFocus();
  }, []);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );

  const onFilterControlsChange = useCallback((newFilters: Filter[]) => {
    setDetectionPageFilters(newFilters);
    if (newFilters.length) {
      const newStatusFilter = newFilters.find(
        (filter) => filter.meta.key === 'kibana.alert.workflow_status'
      );
      if (newStatusFilter) {
        const status: Status[] = newStatusFilter.meta.params
          ? (newStatusFilter.meta.params as Status[])
          : [newStatusFilter.query?.match_phrase['kibana.alert.workflow_status']];
        setStatusFilter(status);
      } else {
        setStatusFilter([]);
      }
    }
  }, []);

  const areDetectionPageFiltersLoading = useMemo(
    () => !Array.isArray(detectionPageFilters),
    [detectionPageFilters]
  );

  const isAlertTableLoading = useMemo(
    () => loading || areDetectionPageFiltersLoading,
    [loading, areDetectionPageFiltersLoading]
  );

  const isChartPanelLoading = useMemo(
    () => isLoadingIndexPattern || areDetectionPageFiltersLoading,
    [isLoadingIndexPattern, areDetectionPageFiltersLoading]
  );

  const AlertPageFilters = useMemo(
    () => (
      <DetectionEngineFilters
        filters={topLevelFilters}
        onFiltersChange={onFilterControlsChange}
        query={query}
        timeRange={{
          from,
          to,
          mode: 'absolute',
        }}
        onInit={setDetectionPageFilterHandler}
        dataViewSpec={sourcererDataView}
      />
    ),
    [from, sourcererDataView, onFilterControlsChange, query, to, topLevelFilters]
  );

  const renderAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <DetectionEngineAlertsTable
          tableType={TableId.alertsOnAlertsPage}
          inputFilters={[...alertsTableDefaultFilters, ...groupingFilters]}
          isLoading={isAlertTableLoading}
        />
      );
    },
    [alertsTableDefaultFilters, isAlertTableLoading]
  );

  if (loading) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} isLoading={loading} />
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    );
  }

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </SecuritySolutionPageWrapper>
    );
  }

  if ((!loading && signalIndexNeedsInit) || needsListsConfiguration) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex
          needsSignalsIndex={signalIndexNeedsInit}
          needsListsIndex={needsListsConfiguration}
        />
      </SecuritySolutionPageWrapper>
    );
  }
  return (
    <>
      {hasEncryptionKey != null && !hasEncryptionKey && <NoApiIntegrationKeyCallOut />}
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      {!signalIndexNeedsInit && (hasIndexRead === false || canUserREAD === false) ? (
        <NoPrivileges
          pageName={i18n.PAGE_TITLE.toLowerCase()}
          docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges}
        />
      ) : !signalIndexNeedsInit && hasIndexRead && canUserREAD ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar
              id={InputsModelId.global}
              pollForSignalIndex={pollForSignalIndex}
              sourcererDataView={sourcererDataView}
            />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper
            noPadding={globalFullScreen}
            data-test-subj="detectionsAlertsPage"
          >
            <Display show={!globalFullScreen}>
              <HeaderPage title={i18n.PAGE_TITLE}>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <FilterByAssigneesPopover
                      selectedUserIds={assignees}
                      onSelectionChange={handleSelectedAssignees}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <SecuritySolutionLinkButton
                      onClick={goToRules}
                      deepLinkId={SecurityPageName.rules}
                      data-test-subj="manage-alert-detection-rules"
                      fill
                    >
                      {i18n.BUTTON_MANAGE_RULES}
                    </SecuritySolutionLinkButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </HeaderPage>
              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="l" />
              {AlertPageFilters}
              <EuiSpacer size="l" />
              <ChartPanels
                addFilter={addFilter}
                alertsDefaultFilters={alertsDefaultFilters}
                isLoadingIndexPattern={isChartPanelLoading}
                query={query}
                runtimeMappings={sourcererDataView.runtimeFieldMap as RunTimeMappings}
                signalIndexName={signalIndexName}
                updateDateRangeCallback={updateDateRangeCallback}
              />
              <EuiSpacer size="l" />
            </Display>
            <GroupedAlertsTable
              currentAlertStatusFilterValue={statusFilter}
              defaultFilters={alertsTableDefaultFilters}
              from={from}
              globalFilters={filters}
              globalQuery={query}
              hasIndexMaintenance={hasIndexMaintenance ?? false}
              hasIndexWrite={hasIndexWrite ?? false}
              loading={isAlertTableLoading}
              renderChildComponent={renderAlertTable}
              runtimeMappings={sourcererDataView.runtimeFieldMap as RunTimeMappings}
              signalIndexName={signalIndexName}
              tableId={TableId.alertsOnAlertsPage}
              to={to}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <EmptyPrompt />
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(dataTableActions.clearSelected({ id })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(dataTableActions.clearEventsLoading({ id })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(dataTableActions.clearEventsDeleted({ id })),
});

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DetectionEnginePage = connector(React.memo(DetectionEnginePageComponent));
