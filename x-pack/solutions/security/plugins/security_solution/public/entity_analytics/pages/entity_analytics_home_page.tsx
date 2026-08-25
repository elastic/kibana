/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux-v7';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
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
import {
  isFaceliftAppHeaderVersion,
  useActiveFaceliftVersion,
} from '../components/home/facelift/active_version';
import { FaceliftHome, FaceliftPageDescription } from '../components/home/facelift/facelift_home';

import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { TabId } from './entity_analytics_management_page';
import { OPEN_CREATE_WATCHLIST_STORAGE_KEY } from '../components/watchlists/watchlists_tab';
import { useNavigateTo } from '../../common/lib/kibana';
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

const MANAGEMENT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.managementButtonLabel',
  { defaultMessage: 'Management' }
);

const SAVE_VIEW_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.saveViewButtonLabel',
  { defaultMessage: 'Save view' }
);

const CREATE_WATCHLIST_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.createWatchlistButtonLabel',
  { defaultMessage: 'Create watchlist' }
);

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
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const { dataView, isLoading: dataViewLoading } = useEntityStoreDataView(spaceId);
  const [faceliftVersion] = useActiveFaceliftVersion();

  // Only subscribe to `search` rather than the whole `location` object so this
  // component doesn't re-render (and re-create callbacks) on unrelated URL
  // updates like flyout params.
  const { search } = useLocation();
  const history = useHistory();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { navigateTo } = useNavigateTo();

  /** v.2+ AppHeader Management → Entity Risk Score tab. */
  const managementHref = useMemo(
    () =>
      getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.entityAnalyticsManagement,
        path: `/${TabId.RiskScore}`,
      }),
    [getSecuritySolutionUrl]
  );

  /** v.1 header gear still deep-links to Watchlists settings. */
  const watchlistsManagementHref = useMemo(
    () =>
      getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.entityAnalyticsManagement,
        path: `/${TabId.Watchlists}`,
      }),
    [getSecuritySolutionUrl]
  );

  const openCreateWatchlist = useCallback(() => {
    try {
      sessionStorage.setItem(OPEN_CREATE_WATCHLIST_STORAGE_KEY, 'true');
    } catch {
      // Ignore quota / private-mode failures; navigation still lands on Watchlists.
    }
    navigateTo({ url: watchlistsManagementHref });
  }, [navigateTo, watchlistsManagementHref]);

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

  const faceliftAppMenu = useMemo<AppHeaderMenu>(() => {
    const items = [
      {
        id: 'entityAnalyticsManagement',
        label: MANAGEMENT_BUTTON_LABEL,
        iconType: 'gear' as const,
        href: managementHref,
        testId: 'eaFaceliftManagementButton',
      },
    ];

    // Save view is v.2 only; Create watchlist is the v.5 primary header action.
    if (faceliftVersion === 'v2') {
      return {
        primaryActionItem: {
          id: 'entityAnalyticsSaveView',
          label: SAVE_VIEW_BUTTON_LABEL,
          iconType: 'save',
          // Prototype: no-op until save-view is wired.
          run: () => undefined,
          testId: 'eaFaceliftSaveViewButton',
        },
        items,
      };
    }

    if (faceliftVersion === 'v5') {
      return {
        primaryActionItem: {
          id: 'entityAnalyticsCreateWatchlist',
          label: CREATE_WATCHLIST_BUTTON_LABEL,
          iconType: 'plusInCircle',
          href: watchlistsManagementHref,
          run: openCreateWatchlist,
          testId: 'eaFaceliftCreateWatchlistButton',
        },
        items,
      };
    }

    return { items };
  }, [faceliftVersion, managementHref, openCreateWatchlist, watchlistsManagementHref]);

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
      {isFaceliftAppHeaderVersion(faceliftVersion) ? (
        <Global
          styles={css`
            /* AppHeader layout: let header go edge-to-edge; content owns its own inset. */
            [data-test-subj='pageContainer'].securityPageWrapper {
              padding-inline: 0 !important;
            }
            [data-test-subj='pageContainer'].securityPageWrapper
              > [class*='euiPageSection__content'] {
              padding-block: 0 !important;
            }
          `}
        />
      ) : null}

      {faceliftVersion === 'v1' ? (
        <FiltersGlobal>
          <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
        </FiltersGlobal>
      ) : null}

      {isFaceliftAppHeaderVersion(faceliftVersion) ? (
        <AppHeader title={PAGE_TITLE} menu={faceliftAppMenu} />
      ) : (
        <HeaderPage
          title={PAGE_TITLE}
          border
          subtitle={<FaceliftPageDescription version={faceliftVersion} />}
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
                    href={watchlistsManagementHref}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />
      )}

      {isFaceliftAppHeaderVersion(faceliftVersion) ? (
        <div
          css={css`
            padding-inline: ${euiTheme.size.base}; /* 16px */
            padding-block-start: ${euiTheme.size.base}; /* 16px above KQL */
          `}
        >
          <FaceliftHome
            key={faceliftVersion}
            version={faceliftVersion}
            dataView={dataView}
            dataViewLoading={dataViewLoading}
            selectedWatchlistId={selectedWatchlistId}
            onWatchlistChange={setSelectedWatchlist}
          />
        </div>
      ) : (
        <FaceliftHome
          key={faceliftVersion}
          version={faceliftVersion}
          dataView={dataView}
          dataViewLoading={dataViewLoading}
          selectedWatchlistId={selectedWatchlistId}
          onWatchlistChange={setSelectedWatchlist}
        />
      )}
    </>
  );
};
