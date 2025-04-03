/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, EuiBadge } from '@elastic/eui';
import { installationStatuses, type IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { CONFIGURATIONS_PATH } from '../../../../common/constants';
import { RETURN_APP_ID, RETURN_PATH } from '../components/integrations/constants';
import { IntegrationsFacets } from '../../constants';

export const FEATURED_INTEGRATION_SORT_ORDER = [
  // 'splunk',
  'google_secops',
  'microsoft_sentinel',
  'sentinel_one',
  'crowdstrike',
];

const addPathParamToUrl = (url: string, path: string) => {
  const encodedPath = encodeURIComponent(path);
  const paramsString = `${RETURN_APP_ID}=${SECURITY_UI_APP_ID}&${RETURN_PATH}=${encodedPath}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
};

const applyCategoryBadgeAndStyling = (
  card: IntegrationCardItem,
  callerView: IntegrationsFacets
): IntegrationCardItem => {
  // Build the return location
  const returnPath = `${CONFIGURATIONS_PATH}/integrations/${callerView}`;
  const url = addPathParamToUrl(card.url, returnPath);
  // Set the custom badges for SIEM and EDR/XDR categories
  const categoryBadge = card.categories.includes('edr_xdr')
    ? 'EDR/XDR'
    : card.categories.includes('siem')
    ? 'SIEM'
    : null;
  return {
    ...card,
    url,
    showDescription: false,
    showReleaseBadge: false,
    extraLabelsBadges: categoryBadge
      ? ([
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xs" />
            <span>
              <EuiBadge color="hollow">{categoryBadge}</EuiBadge>
            </span>
          </EuiFlexItem>,
        ] as React.ReactNode[])
      : [],
    maxCardHeight: 88,
  };
};

const applyCustomDisplayOrder = (integrationsList: IntegrationCardItem[]) => {
  return integrationsList.sort(
    (a, b) =>
      FEATURED_INTEGRATION_SORT_ORDER.indexOf(a.name) -
      FEATURED_INTEGRATION_SORT_ORDER.indexOf(b.name)
  );
};

export const useEnhancedIntegrationCards = (
  integrationsList: IntegrationCardItem[]
): { available: IntegrationCardItem[]; installed: IntegrationCardItem[] } => {
  const sorted = applyCustomDisplayOrder(integrationsList);

  const available = useMemo(
    () => sorted.map((card) => applyCategoryBadgeAndStyling(card, IntegrationsFacets.available)),
    [sorted]
  );

  const installed = useMemo(
    () =>
      sorted
        .map((card) => applyCategoryBadgeAndStyling(card, IntegrationsFacets.installed))
        .filter(
          (card) =>
            card.installStatus === installationStatuses.Installed ||
            card.installStatus === installationStatuses.InstallFailed
        ),
    [sorted]
  );

  return { available, installed };
};
