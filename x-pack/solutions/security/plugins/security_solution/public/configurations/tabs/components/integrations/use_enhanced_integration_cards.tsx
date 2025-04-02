/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, EuiBadge } from '@elastic/eui';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { CONFIGURATIONS_PATH } from '../../../../../common/constants';
import { RETURN_APP_ID, RETURN_PATH } from './constants';
import type { IntegrationsFacets } from '../../../constants';

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

export const useEnhancedIntegrationCards = (
  integrationsList: IntegrationCardItem[],
  callerView: IntegrationsFacets
): IntegrationCardItem[] => {
  const enhancedIntegrationsList = useMemo(
    () => integrationsList.map((card) => applyCategoryBadgeAndStyling(card, callerView)),
    [integrationsList, callerView]
  );
  return enhancedIntegrationsList;
};
