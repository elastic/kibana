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
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import { CONFIGURATIONS_PATH } from '../../../../../../common/constants';
import { IntegrationsFacets } from '../../../../../configurations/constants';
import { RETURN_APP_ID, RETURN_PATH } from './constants';

export interface EnhancedCardOptions {
  showInstallationStatus?: boolean;
  showCompressedInstallationStatus?: boolean;
  returnPath?: string;
  hasDataStreams?: boolean;
}

export const FEATURED_INTEGRATION_SORT_ORDER = [
  'epr:splunk',
  'epr:google_secops',
  'epr:microsoft_sentinel',
  'epr:sentinel_one',
  'epr:crowdstrike',
];
const INTEGRATION_CARD_MIN_HEIGHT_PX = 88;

const addPathParamToUrl = (url: string, path: string | undefined) => {
  if (!path) {
    return url;
  }
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
  options?: EnhancedCardOptions
): IntegrationCardItem => {
  const url = addPathParamToUrl(card.url, options?.returnPath);
  const categoryBadge = getCategoryBadgeIfAny(card.categories);
  return {
    ...card,
    url,
    showInstallationStatus: options?.showInstallationStatus,
    showCompressedInstallationStatus: options?.showCompressedInstallationStatus,
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
    minCardHeight: INTEGRATION_CARD_MIN_HEIGHT_PX,
    hasDataStreams: options?.hasDataStreams,
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
  activeIntegrations: GetInstalledPackagesResponse['items'] = [],
  options?: EnhancedCardOptions
): { available: IntegrationCardItem[]; installed: IntegrationCardItem[] } => {
  const sorted = applyCustomDisplayOrder(integrationsList);

  const available = useMemo(
    () =>
      sorted.map((card) =>
        applyCategoryBadgeAndStyling(card, {
          ...options,
          hasDataStreams: activeIntegrations.some(({ name }) => name === card.name),
        })
      ),
    [sorted, options, activeIntegrations]
  );

  const installed = useMemo(
    () =>
      sorted
        .map((card) =>
          applyCategoryBadgeAndStyling(card, {
            ...options,
            returnPath: `${CONFIGURATIONS_PATH}/integrations/${IntegrationsFacets.installed}`,
          })
        )
        .filter(
          (card) =>
            card.installStatus === installationStatuses.Installed ||
            card.installStatus === installationStatuses.InstallFailed
        ),
    [sorted, options]
  );

  return { available, installed };
};
