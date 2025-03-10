/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { Filter } from '@kbn/es-query';
import { isTab } from '@kbn/timelines-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { dataTableSelectors, tableDefaults, TableId } from '@kbn/securitysolution-data-table';
import { LastEventIndexKey } from '@kbn/timelines-plugin/common';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { SecurityPageName } from '../../../app/types';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { LastEventTime } from '../../../common/components/last_event_time';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { TabNavigation } from '../../../common/components/navigation/tab_navigation';
import { HostsKpiComponent } from '../components/kpi_hosts';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/kuery';
import type { State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';

import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { Display } from './display';
import { HostsTabs } from './hosts_tabs';
import { navTabsHosts } from './nav_tabs';
import * as i18n from './translations';
import { hostsModel, hostsSelectors } from '../store';
import { generateSeverityFilter } from '../store/helpers';
import { HostsTableType } from '../store/model';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
  showGlobalFilters,
} from '../../../timelines/components/timeline/helpers';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { ID } from '../containers/hosts';
import { EmptyPrompt } from '../../../common/components/empty_prompt';
import { fieldNameExistsFilter } from '../../../common/components/visualization_actions/utils';
import { useLicense } from '../../../common/hooks/use_license';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const HostsComponent = () => {
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => (getTable(state, TableId.hostsPageEvents) ?? tableDefaults).graphEventId
  );
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const getHostRiskScoreFilterQuerySelector = useMemo(
    () => hostsSelectors.hostRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelection = useDeepEqualSelector((state: State) =>
    getHostRiskScoreFilterQuerySelector(state, hostsModel.HostsType.page)
  );

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const capabilities = useMlCapabilities();
  const { uiSettings } = useKibana().services;
  const { tabName } = useParams<{ tabName: string }>();
  const tabsFilters: Filter[] = React.useMemo(() => {
    const hostNameExistsFilter = fieldNameExistsFilter(SecurityPageName.hosts);
    if (tabName === HostsTableType.events) {
      return [...globalFilters, ...hostNameExistsFilter];
    }

    if (tabName === HostsTableType.risk) {
      const severityFilter = generateSeverityFilter(severitySelection, EntityType.host);
      return [...globalFilters, ...hostNameExistsFilter, ...severityFilter];
    }

    return globalFilters;
  }, [globalFilters, severitySelection, tabName]);

  const { indicesExist, selectedPatterns, sourcererDataView } = useSourcererDataView();
  const [globalFilterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataViewSpec: sourcererDataView,
        queries: [query],
        filters: globalFilters,
      }),
    [globalFilters, sourcererDataView, uiSettings, query]
  );
  const [tabsFilterQuery] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataViewSpec: sourcererDataView,
        queries: [query],
        filters: tabsFilters,
      }),
    [sourcererDataView, query, tabsFilters, uiSettings]
  );

  useInvalidFilterQuery({
    id: ID,
    filterQuery: globalFilterQuery,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  const isEnterprisePlus = useLicense().isEnterprise();

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    containerElement.current
      ?.querySelector<HTMLButtonElement>('.inspectButtonComponent:last-of-type')
      ?.focus();
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

  return (
    <>
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <Display show={!globalFullScreen}>
              <HeaderPage
                subtitle={
                  <LastEventTime indexKey={LastEventIndexKey.hosts} indexNames={selectedPatterns} />
                }
                title={i18n.PAGE_TITLE}
                border
              />

              <HostsKpiComponent from={from} to={to} />

              <EuiSpacer />

              <TabNavigation
                navTabs={navTabsHosts({
                  hasMlUserPermissions: hasMlUserPermissions(capabilities),
                  isEnterprise: isEnterprisePlus,
                })}
              />

              <EuiSpacer />
            </Display>

            <HostsTabs
              deleteQuery={deleteQuery}
              to={to}
              filterQuery={tabsFilterQuery}
              isInitializing={isInitializing}
              indexNames={selectedPatterns}
              setQuery={setQuery}
              from={from}
              type={hostsModel.HostsType.page}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};
HostsComponent.displayName = 'HostsComponent';

export const Hosts = React.memo(HostsComponent);
