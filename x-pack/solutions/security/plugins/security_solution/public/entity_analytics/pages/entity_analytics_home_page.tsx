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
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
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
import { WatchlistFilter } from '../components/watchlists/watchlist_filter';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY } from '../components/home/constants';
import {
  DataViewContext,
  useEntityURLState,
  DEFAULT_ENTITIES_TABLE_CONFIG,
  DEFAULT_ENTITIES_TABLE_SORT,
  type EntitiesBaseURLQuery,
  EntitiesTableSection,
  type URLQuery,
} from '../components/home/entities_table';
import type { ActiveFilter } from '../components/home/facelift/data';
import { OverviewBand } from '../components/home/facelift/overview_band';
import { FaceliftFilterProvider } from '../components/home/facelift/filter_context';

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

const EntityAnalyticsHomePageContent = () => {
  const dispatch = useDispatch();
  const spaceId = useSpaceId();
  const { dataView, isLoading: dataViewLoading } = useEntityStoreDataView(spaceId);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);

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
    <FaceliftFilterProvider activeFilter={activeFilter}>
      <FiltersGlobal>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={true}>
            <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
          </EuiFlexItem>
          {activeFilter && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                iconType="cross"
                iconSide="right"
                iconOnClick={clearActiveFilter}
                iconOnClickAriaLabel={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.facelift.clearFilterAriaLabel',
                  { defaultMessage: 'Clear filter' }
                )}
                data-test-subj="eaFaceliftActiveFilterBadge"
              >
                {activeFilter.label}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </FiltersGlobal>

      <HeaderPage
        title={PAGE_TITLE}
        rightSideItems={[
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <WatchlistFilter
                selectedId={selectedWatchlistId ?? ''}
                onChangeSelectedId={setSelectedWatchlist}
              />
            </EuiFlexItem>
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
          <OverviewBand activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </EuiFlexItem>

        <EuiPanel hasBorder>
          <EntityAnalyticsEntitiesTable
            entityDataView={dataView}
            entityDataViewLoading={dataViewLoading}
          />
        </EuiPanel>
      </EuiFlexGroup>
    </FaceliftFilterProvider>
  );
};

const EntityAnalyticsEntitiesTable = ({
  entityDataView,
  entityDataViewLoading,
}: {
  entityDataView: ReturnType<typeof useEntityStoreDataView>['dataView'];
  entityDataViewLoading: boolean;
}) => {
  // Stable provider value so consumers below (e.g. the memoized
  // `EntitiesTableSection` subtree) are not forced to re-render by a new
  // context reference when this component re-renders on an unrelated URL change.
  const dataViewContextValue = useMemo(
    () => ({
      dataView: entityDataView,
      dataViewIsLoading: entityDataViewLoading,
    }),
    [entityDataView, entityDataViewLoading]
  );

  if (entityDataViewLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
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
      <EntityAnalyticsEntitiesTableContent />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = () => {
  const urlState = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    defaultQuery: getDefaultQuery,
  });

  return <EntitiesTableSection state={urlState} config={DEFAULT_ENTITIES_TABLE_CONFIG} />;
};
