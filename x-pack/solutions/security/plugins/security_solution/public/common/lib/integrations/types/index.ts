/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';

export interface IntegrationCardMetadata {
  isAgentRequired: boolean;
  activeIntegrations: GetInstalledPackagesResponse['items'];
}

export interface Tab {
  category: string;
  featuredCardIds?: Array<IntegrationCardItem['id']>;
  iconType?: string;
  id: IntegrationTabId;
  label: string;
  overflow?: 'hidden' | 'scroll';
  showSearchTools?: boolean;
  subCategory?: string;
  appendAutoImportCard?: boolean;
  sortByFeaturedIntegrations: boolean;
  height?: string;
}

export enum IntegrationTabId {
  recommended = 'recommended',
  recommendedSearchAILake = 'recommendedSearchAILake',
  network = 'network',
  user = 'user',
  endpoint = 'endpoint',
  cloud = 'cloud',
  threatIntel = 'threatIntel',
  all = 'all',
}

export type TopCalloutRenderer = React.FC<{
  activeIntegrationsCount: number;
  isAgentRequired?: boolean;
  selectedTabId: IntegrationTabId;
}>;
