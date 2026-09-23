/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { DashboardListingTable } from '@kbn/dashboard-plugin/public';
import { LandingLinksImageCards } from '@kbn/security-solution-navigation/landing_links';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n as i18nCore } from '@kbn/i18n';
import { useContractComponents } from '../../../common/hooks/use_contract_component';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../common/constants';
import { useCapabilities, useKibana, useNavigateTo } from '../../../common/lib/kibana';
import { useRootNavLink } from '../../../common/links/nav_links';
import * as i18n from './translations';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../common/lib/telemetry';
import { useCreateSecurityDashboardLink } from '../../hooks/use_create_security_dashboard_link';
import { useGetSecuritySolutionUrl } from '../../../common/components/link_to';
import { useGlobalQueryString } from '../../../common/utils/global_query_string';
import { trackLandingLinkClick } from '../../../common/lib/telemetry/trackers';
import type { TagReference } from '../../context/dashboard_context';
import { useSecurityTags } from '../../context/dashboard_context';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';

const getInitialFilterString = (securityTags: TagReference[] | null | undefined) => {
  if (!securityTags) {
    return;
  }
  const uniqueQuerySet = securityTags?.reduce<Set<string>>((acc, { name }) => {
    const nameString = `"${name}"`;
    if (name && !acc.has(nameString)) {
      acc.add(nameString);
    }
    return acc;
  }, new Set());

  const query = [...uniqueQuerySet].join(' or');
  return `tag:(${query})`;
};

const CREATE_DASHBOARD_LABEL = i18nCore.translate(
  'xpack.securitySolution.dashboards.landing.createDashboardButton',
  {
    defaultMessage: 'Create dashboard',
  }
);

const DashboardsHeader: React.FC<{ canCreateDashboard: boolean }> = ({ canCreateDashboard }) => {
  const { isLoading, url } = useCreateSecurityDashboardLink();
  const { navigateTo } = useNavigateTo();
  const { docLinks } = useKibana().services;
  const { href: addIntegrationsHref } = useAddIntegrationsUrl();

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      // Always show Create next to the kebab (disable when the user cannot create).
      primaryActionItem: {
        id: 'createDashboard',
        label: CREATE_DASHBOARD_LABEL,
        iconType: 'plusCircle',
        href: url,
        disableButton: !canCreateDashboard || isLoading,
        testId: 'createDashboardButton',
        run: () => {
          track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.CREATE_DASHBOARD}`);
          navigateTo({ url });
        },
      },
      // Page action above the automatic Documentation / Feedback footer (divider between them).
      items: [
        {
          id: 'addIntegrations',
          label: i18nCore.translate(
            'xpack.securitySolution.dashboards.landing.addIntegrationsMenuItem',
            { defaultMessage: 'Add integrations' }
          ),
          iconType: 'indexOpen',
          href: addIntegrationsHref,
          overflow: true,
          testId: 'dashboardsHeaderAddIntegrations',
        },
      ],
    }),
    [addIntegrationsHref, canCreateDashboard, isLoading, navigateTo, url]
  );

  return (
    // [Chrome Next] Migrated header — parent is a 16px page grid (Figma); bleed full-bleeds the border.
    <AppHeader
      title="Dashboards"
      menu={menu}
      docLink={docLinks.links.siem.guide}
      spacing="bleed"
    />
  );
};

export const DashboardsLandingPage = () => {
  const { DashboardsLandingCallout } = useContractComponents();
  const { links = [] } = useRootNavLink(SecurityPageName.dashboards) ?? {};
  const urlState = useGlobalQueryString();
  const { show: canReadDashboard, createNew: canCreateDashboard } =
    useCapabilities<DashboardCapabilities>('dashboard_v2');
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { euiTheme } = useEuiTheme();
  const getSecuritySolutionDashboardUrl = useCallback(
    (id: string) =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: id,
      })}`,
    [getSecuritySolutionUrl]
  );

  const goToDashboard = useCallback(
    (dashboardId: string | undefined) => {
      track(METRIC_TYPE.CLICK, TELEMETRY_EVENT.DASHBOARD);
      navigateTo({
        url: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.dashboards,
          path: dashboardId ?? 'create',
        }),
      });
    },
    [getSecuritySolutionUrl, navigateTo]
  );

  const securityTags = useSecurityTags();
  const securityTagsExist = securityTags && securityTags?.length > 0;

  const initialFilter = useMemo(() => getInitialFilterString(securityTags), [securityTags]);

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — escape the section
  // gutter and re-apply a 16px page grid so AppHeader `bleed` matches the design.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  return (
    <SecuritySolutionPageWrapper>
      <div css={chromeNextPage}>
        <DashboardsHeader canCreateDashboard={canCreateDashboard} />
        <EuiSpacer size="m" />
        {DashboardsLandingCallout && (
          <>
            <DashboardsLandingCallout />
            <EuiSpacer size="xl" />
          </>
        )}

        <LandingLinksImageCards
          items={links}
          urlState={urlState}
          onLinkClick={trackLandingLinkClick}
        />
        <EuiSpacer size="m" />

        {canReadDashboard && securityTagsExist && initialFilter && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h2>{i18n.DASHBOARDS_PAGE_SECTION_CUSTOM}</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <EuiSpacer size="m" />
            <DashboardListingTable
              disableCreateDashboardButton={!canCreateDashboard}
              getDashboardUrl={getSecuritySolutionDashboardUrl}
              goToDashboard={goToDashboard}
              initialFilter={initialFilter}
              urlStateEnabled={false}
              showCreateDashboardButton={false}
            />
          </>
        )}
        {canReadDashboard && !securityTagsExist && (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="l" data-test-subj="dashboardLoadingIcon" />}
          />
        )}
      </div>

      <SpyRoute pageName={SecurityPageName.dashboards} />
    </SecuritySolutionPageWrapper>
  );
};
