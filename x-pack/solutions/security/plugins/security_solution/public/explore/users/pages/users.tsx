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
import { LastEventIndexKey } from '@kbn/timelines-plugin/common';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { SecurityPageName } from '../../../app/types';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { HeaderPage } from '../../../common/components/header_page';
import { TabNavigation } from '../../../common/components/navigation/tab_navigation';

import { SiemSearchBar } from '../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { LastEventTime } from '../../../common/components/last_event_time';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/kuery';
import type { State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';

import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { UsersTabs } from './users_tabs';
import { navTabsUsers } from './nav_tabs';
import * as i18n from './translations';
import { usersModel, usersSelectors } from '../store';
import {
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
} from '../../../timelines/components/timeline/helpers';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { UsersKpiComponent } from '../components/kpi_users';
import { EntityType } from '../../../../common/entity_analytics/types';
import { generateSeverityFilter } from '../../hosts/store/helpers';
import { UsersTableType } from '../store/model';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { EmptyPrompt } from '../../../common/components/empty_prompt';
import { userNameExistsFilter } from './details/helpers';

const ID = 'UsersQueryId';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const UsersComponent = () => {
  const containerElement = useRef<HTMLDivElement | null>(null);

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const getUserRiskScoreFilterQuerySelector = useMemo(
    () => usersSelectors.userRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelection = useDeepEqualSelector((state: State) =>
    getUserRiskScoreFilterQuerySelector(state)
  );

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const { uiSettings } = useKibana().services;

  const { tabName } = useParams<{ tabName: string }>();
  const tabsFilters: Filter[] = React.useMemo(() => {
    if (tabName === UsersTableType.events) {
      return [...globalFilters, ...userNameExistsFilter];
    }

    if (tabName === UsersTableType.risk) {
      const severityFilter = generateSeverityFilter(severitySelection, EntityType.user);

      return [...severityFilter, ...globalFilters];
    }
    return globalFilters;
  }, [severitySelection, tabName, globalFilters]);

  const { indicesExist, selectedPatterns, sourcererDataView } = useSourcererDataView();
  const [globalFiltersQuery, kqlError] = useMemo(
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
    filterQuery: globalFiltersQuery,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

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

  const capabilities = useMlCapabilities();
  const navTabs = useMemo(() => navTabsUsers(hasMlUserPermissions(capabilities)), [capabilities]);

  return (
    <>
      {indicesExist ? (
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal>
            <SiemSearchBar sourcererDataView={sourcererDataView} id={InputsModelId.global} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
            <HeaderPage
              subtitle={
                <LastEventTime indexKey={LastEventIndexKey.users} indexNames={selectedPatterns} />
              }
              border
              title={i18n.PAGE_TITLE}
            />

            <UsersKpiComponent from={from} to={to} />

            <EuiSpacer />

            <TabNavigation navTabs={navTabs} />

            <EuiSpacer />

            <UsersTabs
              deleteQuery={deleteQuery}
              filterQuery={tabsFilterQuery}
              from={from}
              indexNames={selectedPatterns}
              isInitializing={isInitializing}
              setQuery={setQuery}
              to={to}
              type={usersModel.UsersType.page}
            />
          </SecuritySolutionPageWrapper>
        </StyledFullHeightContainer>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.users} />
    </>
  );
};
UsersComponent.displayName = 'UsersComponent';

export const Users = React.memo(UsersComponent);
