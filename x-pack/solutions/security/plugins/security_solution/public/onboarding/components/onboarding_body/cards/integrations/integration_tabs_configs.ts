/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationTabId, type Tab } from './types';

export const INTEGRATION_TABS: Tab[] = [
  {
    category: '',
    iconType: 'starFilled',
    id: IntegrationTabId.recommended,
    label: 'Recommended',
    overflow: 'hidden',
    showSearchTools: false,
    // Fleet has a default sorting for integrations by category that Security Solution does not want to apply
    // so we need to disable the sorting for the recommended tab to allow static ordering according to the featuredCardIds
    sortByFeaturedIntegrations: false,
    featuredCardIds: [
      'epr:aws',
      'epr:gcp',
      'epr:azure',
      'epr:endpoint',
      'epr:crowdstrike',
      'epr:wiz',
      'epr:network_traffic',
      'epr:osquery_manager',
    ],
  },
  {
    category: 'security',
    id: IntegrationTabId.network,
    label: 'Network',
    subCategory: 'network',
    showSearchTools: true,
    sortByFeaturedIntegrations: true,
  },
  {
    category: 'security',
    id: IntegrationTabId.user,
    label: 'User',
    subCategory: 'iam',
    showSearchTools: true,
    sortByFeaturedIntegrations: true,
  },
  {
    category: 'security',
    id: IntegrationTabId.endpoint,
    label: 'Endpoint',
    subCategory: 'edr_xdr',
    showSearchTools: true,
    sortByFeaturedIntegrations: true,
  },
  {
    category: 'security',
    id: IntegrationTabId.cloud,
    label: 'Cloud',
    subCategory: 'cloudsecurity_cdr',
    showSearchTools: true,
    sortByFeaturedIntegrations: true,
  },
  {
    category: 'security',
    id: IntegrationTabId.threatIntel,
    label: 'Threat Intel',
    subCategory: 'threat_intel',
    showSearchTools: true,
    sortByFeaturedIntegrations: true,
  },
  {
    category: '',
    id: IntegrationTabId.all,
    label: 'All',
    showSearchTools: true,
    sortByFeaturedIntegrations: true,
  },
];

export const INTEGRATION_TABS_BY_ID = Object.fromEntries(
  INTEGRATION_TABS.map((tab) => [tab.id, tab])
) as Record<IntegrationTabId, Tab>;
