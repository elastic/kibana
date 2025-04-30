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
import { CONFIGURATIONS_PATH } from '../../../../../../common/constants';
import { IntegrationsFacets } from '../../../../../configurations/constants';
import { RETURN_APP_ID, RETURN_PATH } from './constants';

export interface EnhancedCardOptions {
  showInstallationStatus?: boolean;
  showCompressedInstallationStatus?: boolean;
  returnPath?: string;
}

const FEATURED_INTEGRATION_SORT_ORDER = [
  'epr:splunk',
  'epr:google_secops',
  'epr:microsoft_sentinel',
  'epr:sentinel_one',
  'epr:crowdstrike',
];
const INTEGRATION_CARD_MAX_HEIGHT_PX = 88;

const addPathParamToUrl = (url: string, path: string) => {
  const encodedPath = encodeURIComponent(path);
  const paramsString = `${RETURN_APP_ID}=${SECURITY_UI_APP_ID}&${RETURN_PATH}=${encodedPath}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
};

export const getCategoryBadgeIfAny = (categories: string[]): string | null => {
  return categories.includes('edr_xdr') ? 'EDR/XDR' : categories.includes('siem') ? 'SIEM' : null;
};

export const applyCategoryBadgeAndStyling = (
  card: IntegrationCardItem,
  callerView: IntegrationsFacets,
  options?: EnhancedCardOptions
): IntegrationCardItem => {
  const returnPath = options?.returnPath ?? `${CONFIGURATIONS_PATH}/integrations/${callerView}`;
  const url = addPathParamToUrl(card.url, returnPath);
  const categoryBadge = getCategoryBadgeIfAny(card.categories);
  return {
    ...card,
    url,
    showInstallationStatus: options?.showInstallationStatus,
    showCompressedInstallationStatus: options?.showCompressedInstallationStatus,
    showDescription: false,
    showReleaseBadge: false,
    isUnverified: false, // temporarily hiding the 'unverified' badge from the integration card
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
    maxCardHeight: INTEGRATION_CARD_MAX_HEIGHT_PX,
  };
};

const applyCustomDisplayOrder = (
  integrationsList: IntegrationCardItem[]
): IntegrationCardItem[] => {
  return integrationsList.sort(
    (a, b) =>
      FEATURED_INTEGRATION_SORT_ORDER.indexOf(a.id) - FEATURED_INTEGRATION_SORT_ORDER.indexOf(b.id)
  );
};

export const useEnhancedIntegrationCards = (
  integrationsList: IntegrationCardItem[],
  options?: EnhancedCardOptions
): { available: IntegrationCardItem[]; installed: IntegrationCardItem[] } => {
  const sorted = applyCustomDisplayOrder(integrationsList);

  const available = useMemo(
    () =>
      sorted.map((card) =>
        applyCategoryBadgeAndStyling(card, IntegrationsFacets.available, options)
      ),
    [sorted, options]
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
