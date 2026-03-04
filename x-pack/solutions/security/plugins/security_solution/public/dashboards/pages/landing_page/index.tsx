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
  EuiPageSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { DashboardListingTable } from '@kbn/dashboard-plugin/public';
import { LandingLinksImageCards } from '@kbn/security-solution-navigation/landing_links';
import { useContractComponents } from '../../../common/hooks/use_contract_component';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../common/constants';
import { useCapabilities, useNavigateTo } from '../../../common/lib/kibana';
import { useRootNavLink } from '../../../common/links/nav_links';
import { useGetSecuritySolutionUrl } from '../../../common/components/link_to';
import { useGlobalQueryString } from '../../../common/utils/global_query_string';
import * as i18n from './translations';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../common/lib/telemetry';
import { trackLandingLinkClick } from '../../../common/lib/telemetry/trackers';
import type { TagReference } from '../../context/dashboard_context';
import { useSecurityTags } from '../../context/dashboard_context';

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

export const DashboardsLandingPage = () => {
  const { DashboardsLandingCallout } = useContractComponents();
  const { links = [] } = useRootNavLink(SecurityPageName.dashboards) ?? {};
  const urlState = useGlobalQueryString();
  const { show: canReadDashboard, createNew: canCreateDashboard } =
    useCapabilities<DashboardCapabilities>('dashboard_v2');
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
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
  return (
    <SecuritySolutionPageWrapper>
      <EuiPageSection paddingSize="m" component="div" grow>
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

        <SpyRoute pageName={SecurityPageName.dashboards} />
      </EuiPageSection>
    </SecuritySolutionPageWrapper>
  );
};
