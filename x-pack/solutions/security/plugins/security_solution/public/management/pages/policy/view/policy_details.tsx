/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import { EuiCallOut, EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import type { AppHeaderBack, AppHeaderMetadataItems } from '@kbn/app-header';
import type {
  MaybeImmutable,
  PolicyData,
  PolicyDetailsRouteState,
} from '../../../../../common/endpoint/types';
import { usePolicyDetailsSelector } from './policy_hooks';
import { policyDetails, agentStatusSummary, apiError } from '../store/policy_details/selectors';
import { usePolicyTabs } from './tabs';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { getPoliciesPath } from '../../../common/routing';
import { useAppUrl, useKibana } from '../../../../common/lib/kibana';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { APP_UI_ID } from '../../../../../common/constants';

const POLICIES_LIST_LABEL = i18n.translate(
  'xpack.securitySolution.policyDetails.policiesBackLabel',
  { defaultMessage: 'Policies' }
);

const POLICY_DETAILS_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.policyDetails.errorPageTitle',
  { defaultMessage: 'Policy details' }
);

/**
 * Renders once `policyItem` has loaded. Owns the fully-populated header (title, tabs, metadata,
 * docLink) and the tab content body.
 */
const PolicyDetailsLoaded = React.memo<{
  policyItem: MaybeImmutable<PolicyData>;
  back: AppHeaderBack;
  docLink: string;
}>(({ policyItem, back, docLink }) => {
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);
  const { tabs, body } = usePolicyTabs();

  const metadata: AppHeaderMetadataItems = useMemo(() => {
    const online = policyAgentStatusSummary?.online ?? 0;
    const error = policyAgentStatusSummary?.error ?? 0;
    const offline = policyAgentStatusSummary?.offline ?? 0;

    return [
      {
        type: 'health',
        color: 'success',
        label: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.healthyMetadata',
          { defaultMessage: 'Healthy: {count}', values: { count: online } }
        ),
        'data-test-subj': 'policyAgentsSummary-healthy',
      },
      {
        type: 'health',
        color: 'warning',
        label: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.unhealthyMetadata',
          { defaultMessage: 'Unhealthy: {count}', values: { count: error } }
        ),
        'data-test-subj': 'policyAgentsSummary-unhealthy',
      },
      {
        type: 'health',
        color: 'subdued',
        label: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.offlineMetadata',
          { defaultMessage: 'Offline: {count}', values: { count: offline } }
        ),
        'data-test-subj': 'policyAgentsSummary-offline',
      },
    ];
  }, [policyAgentStatusSummary]);

  return (
    <AdministrationListPage
      data-test-subj="policyDetailsPage"
      title={policyItem.name}
      back={back}
      tabs={tabs}
      metadata={metadata}
      docLink={docLink}
      restrictWidth={true}
    >
      {body}
    </AdministrationListPage>
  );
});

PolicyDetailsLoaded.displayName = 'PolicyDetailsLoaded';

export const PolicyDetails = React.memo(() => {
  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();
  const { getAppUrl } = useAppUrl();
  const {
    services: { docLinks },
  } = useKibana();

  const policyApiError = usePolicyDetailsSelector(apiError);
  const policyItem = usePolicyDetailsSelector(policyDetails);

  // The IA parent (`Policies`) unless the route state carries an explicit satellite origin (e.g.
  // opened from Fleet, via `FleetIntegrationArtifactsCard`'s `backLink`). Memoized so the
  // explicit origin, once seen, survives in-page navigation (tab switches) even though that
  // doesn't carry `location.state`.
  const [memoizedBackLink, setMemoizedBackLink] = useState(routeState?.backLink);
  useEffect(() => {
    if (routeState?.backLink) {
      setMemoizedBackLink(routeState.backLink);
    }
  }, [routeState?.backLink]);

  const policyListPath = useMemo(() => getPoliciesPath(), []);
  const backAppId = memoizedBackLink?.navigateTo[0] ?? APP_UI_ID;
  const backPath = memoizedBackLink?.navigateTo[1]?.path ?? policyListPath;
  const backState = memoizedBackLink?.navigateTo[1]?.state;
  const backOnClick = useNavigateToAppEventHandler(backAppId, {
    path: backPath,
    state: backState,
  });

  const back: AppHeaderBack = useMemo(
    () => ({
      href: memoizedBackLink?.href ?? getAppUrl({ path: policyListPath }),
      label: memoizedBackLink?.label ?? POLICIES_LIST_LABEL,
      onClick: backOnClick,
    }),
    [memoizedBackLink, getAppUrl, policyListPath, backOnClick]
  );

  if (policyApiError || !policyItem) {
    return (
      <AdministrationListPage
        data-test-subj="policyDetailsPage"
        title={POLICY_DETAILS_ERROR_TITLE}
        back={back}
        docLink={docLinks.links.securitySolution.policies}
        isHeaderLoading={!policyApiError}
        restrictWidth={true}
      >
        <EuiPageTemplate.Section grow={false} alignment="center">
          {policyApiError ? (
            <EuiCallOut announceOnMount={false} color="danger" title={policyApiError?.error}>
              <span data-test-subj="policyDetailsIdNotFoundMessage">{policyApiError?.message}</span>
            </EuiCallOut>
          ) : (
            <EuiLoadingSpinner
              className="essentialAnimation"
              size="xl"
              data-test-subj="policyDetailsLoading"
            />
          )}
        </EuiPageTemplate.Section>
      </AdministrationListPage>
    );
  }

  return (
    <PolicyDetailsLoaded
      policyItem={policyItem}
      back={back}
      docLink={docLinks.links.securitySolution.policies}
    />
  );
});

PolicyDetails.displayName = 'PolicyDetails';
