/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux-v7';
import { useHistory, useLocation } from 'react-router-dom';
import { useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { InputsModelId } from '../../common/store/inputs/constants';
import { inputsActions } from '../../common/store/inputs';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useLicense } from '../../common/hooks/use_license';
import { PageLoader } from '../../common/components/page_loader';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { FaceliftHome } from '../components/home/facelift/facelift_home';
import { requestProductTourStart } from '../components/home/facelift/v9_1/product_tour';

import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { TabId } from './entity_analytics_management_page';
import { useKibana } from '../../common/lib/kibana';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { EntityAnalyticsReadPrivilegesCallout } from '../components/entity_analytics_read_privileges_callout';
import { useLeadGenerationPrivileges } from '../api/hooks/use_lead_generation_privileges';
import { useAnomalyPrivileges } from '../api/hooks/use_anomaly_privileges';
import { NoPrivileges } from '../../common/components/no_privileges';
import {
  FACELIFT_V9_1_DEFAULT_FROM,
  FACELIFT_V9_1_DEFAULT_TO,
} from '../components/home/facelift/v9_1/time_range';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.homePage.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const SETTINGS_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.settingsButtonLabel',
  { defaultMessage: 'Settings' }
);

const ADD_INTEGRATIONS_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.addIntegrationsButtonLabel',
  { defaultMessage: 'Add integrations' }
);

const PRODUCT_TOUR_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.productTourButtonLabel',
  { defaultMessage: 'Product tour' }
);

const UEBA_INTEGRATIONS_PATH = '/app/integrations/browse/security/advanced_analytics_ueba';

const ENTITY_ANALYTICS_DOC_LINK =
  'https://www.elastic.co/docs/solutions/security/advanced-entity-analytics';

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
  const { chrome, http } = useKibana().services;
  const uebaIntegrationsHref = http.basePath.prepend(UEBA_INTEGRATIONS_PATH);

  /**
   * Native AppHeader overflow includes Feedback only when Chrome has a handler
   * (the feedback plugin registers one after telemetry opt-in). Register one so
   * the three-dots menu matches Workflows: Add integrations, Feedback,
   * Documentation.
   */
  useEffect(() => chrome.next.registerFeedbackHandler(() => undefined), [chrome]);

  // Only subscribe to `search` rather than the whole `location` object so this
  // component doesn't re-render (and re-create callbacks) on unrelated URL
  // updates like flyout params.
  const { search } = useLocation();
  const history = useHistory();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const managementHref = useMemo(
    () =>
      getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.entityAnalyticsManagement,
        path: `/${TabId.RiskScore}`,
      }),
    [getSecuritySolutionUrl]
  );

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

  // Add integrations then Settings in the overflow menu so the native static
  // items (Feedback, Documentation) render below a divider.
  const faceliftAppMenu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'addIntegrations',
          label: ADD_INTEGRATIONS_BUTTON_LABEL,
          iconType: 'indexOpen' as const,
          href: uebaIntegrationsHref,
          overflow: true,
          testId: 'eaFaceliftAddIntegrationsButton',
        },
        {
          id: 'entityAnalyticsSettings',
          label: SETTINGS_BUTTON_LABEL,
          iconType: 'gear' as const,
          href: managementHref,
          overflow: true,
          testId: 'eaFaceliftSettingsButton',
        },
        // Last caller item, so it sits directly above the native Feedback item.
        {
          id: 'entityAnalyticsProductTour',
          label: PRODUCT_TOUR_BUTTON_LABEL,
          iconType: 'bulb' as const,
          run: requestProductTourStart,
          overflow: true,
          testId: 'eaFaceliftProductTourMenuItem',
        },
      ],
    }),
    [managementHref, uebaIntegrationsHref]
  );

  // Design prototype: open on “Last 30 days” instead of the app-wide “Today”.
  useEffect(() => {
    const fromStr = FACELIFT_V9_1_DEFAULT_FROM;
    const toStr = FACELIFT_V9_1_DEFAULT_TO;
    const from = dateMath.parse(fromStr)?.toISOString();
    const to = dateMath.parse(toStr, { roundUp: true })?.toISOString();
    if (!from || !to) {
      return;
    }
    dispatch(
      inputsActions.setRelativeRangeDatePicker({
        id: InputsModelId.global,
        fromStr,
        toStr,
        from,
        to,
      })
    );
  }, [dispatch]);

  // Design prototype: always render the facelift mock UI (do not gate on Entity Store).

  if (dataViewLoading) {
    return <PageLoader />;
  }

  return (
    <>
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

      <AppHeader title={PAGE_TITLE} menu={faceliftAppMenu} docLink={ENTITY_ANALYTICS_DOC_LINK} />

      <div
        css={css`
          padding-inline: ${euiTheme.size.base}; /* 16px */
          padding-block-start: ${euiTheme.size.base}; /* 16px above KQL */
        `}
      >
        <FaceliftHome
          dataView={dataView}
          dataViewLoading={dataViewLoading}
          selectedWatchlistId={selectedWatchlistId}
          onWatchlistChange={setSelectedWatchlist}
        />
      </div>
    </>
  );
};
