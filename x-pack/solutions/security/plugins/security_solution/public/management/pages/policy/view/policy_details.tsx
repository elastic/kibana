/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { useKibana } from '../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../common/constants';
import type { AppHeaderBackLink } from '../../../hooks/use_app_header_back';
import { useAppHeaderBack } from '../../../hooks/use_app_header_back';

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
  back: AppHeaderBack | undefined;
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
          { defaultMessage: 'Healthy: {count, number}', values: { count: online } }
        ),
        'data-test-subj': 'policyAgentsSummary-healthy',
      },
      {
        type: 'health',
        color: 'warning',
        label: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.unhealthyMetadata',
          { defaultMessage: 'Unhealthy: {count, number}', values: { count: error } }
        ),
        'data-test-subj': 'policyAgentsSummary-unhealthy',
      },
      {
        type: 'health',
        color: 'subdued',
        label: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.offlineMetadata',
          { defaultMessage: 'Offline: {count, number}', values: { count: offline } }
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
  const {
    services: { docLinks },
  } = useKibana();

  const policyApiError = usePolicyDetailsSelector(apiError);
  const policyItem = usePolicyDetailsSelector(policyDetails);

  // The IA parent (`Policies`) unless the route state carries an explicit satellite origin (e.g.
  // opened from the Endpoints list or from Fleet). Tab switches keep that state.
  const policiesBackLink = useMemo<AppHeaderBackLink>(
    () => ({
      label: POLICIES_LIST_LABEL,
      navigateTo: [APP_UI_ID, { path: getPoliciesPath() }],
    }),
    []
  );
  const back = useAppHeaderBack(routeState?.backLink ?? policiesBackLink);

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
