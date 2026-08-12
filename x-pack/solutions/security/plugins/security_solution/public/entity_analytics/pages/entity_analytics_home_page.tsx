/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { css } from '@emotion/react';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { inputsActions } from '../../common/store/inputs';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useLicense } from '../../common/hooks/use_license';
import { PageLoader } from '../../common/components/page_loader';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY } from '../components/home/constants';
import {
  DataViewContext,
  useEntityURLState,
  DEFAULT_ENTITIES_TABLE_SORT,
  type EntitiesBaseURLQuery,
  type URLQuery,
} from '../components/home/entities_table';
import type { ActiveFilter, PageFilters, TableView } from '../components/home/facelift/data';
import { EMPTY_PAGE_FILTERS } from '../components/home/facelift/data';
import { EntityFiltersGroup } from '../components/home/facelift/entity_filters_group';
import { OverviewBand } from '../components/home/facelift/overview_band';
import { ResolvedEntitiesGrid } from '../components/home/facelift/resolved_entities_grid';
import { getEntitySummary } from '../components/home/facelift/resolved_entities_data';
import type { PageFilterFacet } from '../components/home/facelift/overview_filter';
import { useSyncEntityFilters } from '../components/home/facelift/overview_filter';

import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { TabId } from './entity_analytics_management_page';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { EntityAnalyticsReadPrivilegesCallout } from '../components/entity_analytics_read_privileges_callout';
import { useLeadGenerationPrivileges } from '../api/hooks/use_lead_generation_privileges';
import { useAnomalyPrivileges } from '../api/hooks/use_anomaly_privileges';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { EntityStoreDisabledEmptyPrompt } from './entity_store_disabled_empty_prompt';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../common/constants';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.homePage.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: DEFAULT_ENTITIES_TABLE_SORT,
  pageIndex: 0,
});

export const EntityAnalyticsHomePage = () => {
  const riskEngineReadPrivileges = useMissingRiskEnginePrivileges({ readonly: true });
  const entityEnginePrivilegesQuery = useEntityEnginePrivileges();
  const isEnterprise = useLicense().isEnterprise();
  const leadGenerationEnabled =
    useIsExperimentalFeatureEnabled('leadGenerationEnabled') && isEnterprise;
  const anomalyDetailsEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsAnomalyDetails');
  const leadGenerationPrivilegesQuery = useLeadGenerationPrivileges(leadGenerationEnabled);
  const anomalyPrivilegesQuery = useAnomalyPrivileges(anomalyDetailsEnabled);

  if (entityEnginePrivilegesQuery.isLoading || riskEngineReadPrivileges.isLoading) {
    return <PageLoader />;
  }

  const noPrivileges =
    !entityEnginePrivilegesQuery.isError && !entityEnginePrivilegesQuery.data?.has_read_permissions;

  return (
    <>
      <EntityAnalyticsReadPrivilegesCallout
        riskEngineReadPrivileges={riskEngineReadPrivileges}
        entityEnginePrivileges={entityEnginePrivilegesQuery.data}
        leadGenerationPrivileges={leadGenerationPrivilegesQuery.data}
        anomalyPrivileges={anomalyPrivilegesQuery.data}
        id="entity-analytics-home"
      />
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsHomePage">
        {noPrivileges ? (
          <NoPrivileges
            pageName={PAGE_TITLE.toLowerCase()}
            docLinkSelector={(docLinks) =>
              docLinks.securitySolution.entityAnalytics.riskScorePrerequisites
            }
          />
        ) : (
          <EntityAnalyticsHomePageContent />
        )}
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

/**
 * Page scope at a glance: how many entities there are, how many of them are
 * worth attention, and which way that number is moving.
 */
const EntityAnalyticsPageDescription = () => {
  const { euiTheme } = useEuiTheme();
  const summary = useMemo(() => getEntitySummary(), []);

  const climbing = summary.criticalAndHighDelta >= 0;
  const separator = (
    <span
      aria-hidden={true}
      css={css`
        margin-inline: ${euiTheme.size.s};
        color: ${euiTheme.colors.textDisabled};
      `}
    >
      {'●'}
    </span>
  );

  return (
    <span data-test-subj="eaFaceliftPageDescription">
      {`${summary.total.toLocaleString()} entities`}
      {separator}
      {`${summary.criticalAndHigh.toLocaleString()} critical- and high-risk`}
      {separator}
      <EuiIcon
        type={climbing ? 'sortUp' : 'sortDown'}
        size="s"
        color={climbing ? 'danger' : 'success'}
        aria-hidden={true}
      />
      {` ${Math.abs(summary.criticalAndHighDelta).toLocaleString()} vs yesterday`}
    </span>
  );
};

const EntityAnalyticsHomePageContent = () => {
  const dispatch = useDispatch();
  const spaceId = useSpaceId();
  const { dataView, isLoading: dataViewLoading } = useEntityStoreDataView(spaceId);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [pageFilters, setPageFilters] = useState<PageFilters>(EMPTY_PAGE_FILTERS);

  // Only subscribe to `search` rather than the whole `location` object so this
  // component doesn't re-render (and re-create callbacks) on unrelated URL
  // updates like flyout params.
  const { search } = useLocation();
  const history = useHistory();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const selectedWatchlistId = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('watchlistId') || undefined;
  }, [search]);

  const setSelectedWatchlist = useCallback(
    (id?: string, name?: string) => {
      // Read the latest search from `history.location` to keep this callback's
      // reference stable across unrelated URL updates.
      const params = new URLSearchParams(history.location.search);
      if (id) {
        params.set('watchlistId', id);
      } else {
        params.delete('watchlistId');
      }
      if (name) {
        params.set('watchlistName', name);
      } else {
        params.delete('watchlistName');
      }
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );

  const clearActiveFilter = useCallback(() => setActiveFilter(null), []);

  const clearFacet = useCallback(
    (facet: PageFilterFacet) => setPageFilters((current) => ({ ...current, [facet]: [] })),
    []
  );

  // Every selection on the page lives in the KQL bar as a regular filter pill,
  // which is also what drives the entities table.
  useSyncEntityFilters({
    activeFilter,
    pageFilters,
    onClearOverview: clearActiveFilter,
    onClearFacet: clearFacet,
    dataViewId: dataView?.id,
  });

  // Design prototype: show "Today" in the KQL bar date picker on page entry
  // (same relative range Alerts/Discover use via DEFAULT_FROM / DEFAULT_TO).
  useEffect(() => {
    const from = dateMath.parse(DEFAULT_FROM)?.toISOString();
    const to = dateMath.parse(DEFAULT_TO, { roundUp: true })?.toISOString();
    if (!from || !to) {
      return;
    }
    dispatch(
      inputsActions.setRelativeRangeDatePicker({
        id: InputsModelId.global,
        fromStr: DEFAULT_FROM,
        toStr: DEFAULT_TO,
        from,
        to,
      })
    );
  }, [dispatch]);

  const { data: entityStoreStatusData } = useEntityStoreStatus();
  const entityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';
  // While an engine is still provisioning its assets the entity-latest index (and its data
  // view) may not be resolvable yet. Show a loader rather than the entity page or the generic
  // onboarding screen; the status query polls every 5s while installing and re-renders to the
  // homepage once it flips to `running`. See elastic/security-team#18599.
  const entityStoreInstalling = entityStoreStatusData?.status === 'installing';

  if (dataViewLoading) {
    return <PageLoader />;
  }

  if (entityStoreDisabled) {
    return <EntityStoreDisabledEmptyPrompt />;
  }

  if (entityStoreInstalling) {
    return <PageLoader />;
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
      </FiltersGlobal>

      <HeaderPage
        title={PAGE_TITLE}
        border
        subtitle={<EntityAnalyticsPageDescription />}
        rightSideItems={[
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.homePage.watchlistsSettingsButtonAriaLabel',
                  { defaultMessage: 'Watchlists settings' }
                )}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  display="base"
                  iconType="gear"
                  size="m"
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.homePage.watchlistsSettingsButtonAriaLabel',
                    { defaultMessage: 'Watchlists settings' }
                  )}
                  href={getSecuritySolutionUrl({
                    deepLinkId: SecurityPageName.entityAnalyticsManagement,
                    path: `/${TabId.Watchlists}`,
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />

      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EntityFiltersGroup
            pageFilters={pageFilters}
            onPageFiltersChange={setPageFilters}
            selectedWatchlistId={selectedWatchlistId}
            onWatchlistChange={setSelectedWatchlist}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <OverviewBand
            activeFilter={activeFilter}
            pageFilters={pageFilters}
            onFilterChange={setActiveFilter}
          />
        </EuiFlexItem>

        <EuiPanel hasBorder paddingSize="l">
          <EntityAnalyticsEntitiesTable
            entityDataView={dataView}
            entityDataViewLoading={dataViewLoading}
          />
        </EuiPanel>
      </EuiFlexGroup>
    </>
  );
};

const TABLE_VIEW_OPTIONS: Array<{ id: TableView; label: string; iconType: IconType }> = [
  { id: 'resolved', label: 'Resolved entities', iconType: 'aggregate' },
  { id: 'raw', label: 'Raw records', iconType: 'listBullet' },
];

const EntityAnalyticsEntitiesTable = ({
  entityDataView,
  entityDataViewLoading,
}: {
  entityDataView: ReturnType<typeof useEntityStoreDataView>['dataView'];
  entityDataViewLoading: boolean;
}) => {
  const [view, setView] = useState<TableView>('resolved');

  // Stable provider value so consumers below are not forced to re-render by a
  // new context reference when this component re-renders on an unrelated URL
  // change.
  const dataViewContextValue = useMemo(
    () => ({
      dataView: entityDataView,
      dataViewIsLoading: entityDataViewLoading,
    }),
    [entityDataView, entityDataViewLoading]
  );

  const onChangeView = useCallback((id: string) => setView(id as TableView), []);

  if (entityDataViewLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.homePage.entitiesTableTitle"
                defaultMessage="Entities"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Entities table view"
            options={TABLE_VIEW_OPTIONS}
            idSelected={view}
            onChange={onChangeView}
            buttonSize="compressed"
            data-test-subj="eaFaceliftEntitiesViewToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EntityAnalyticsEntitiesTableContent view={view} />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = ({ view }: { view: TableView }) => {
  const urlState = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    defaultQuery: getDefaultQuery,
  });

  return <ResolvedEntitiesGrid query={urlState.query} view={view} />;
};
