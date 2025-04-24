/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { UseSelectedTabReturn } from '../hooks/use_selected_tab';

export interface InstalledIntegrationItem {
  dataStream: string[];
  name: string;
  title: string;
  status: string;
}

export interface InstalledIntegrations {
  items: InstalledIntegrationItem[];
}

export interface IntegrationCardMetadata {
  installedIntegrationsCount: number;
  isAgentRequired: boolean;
  installedIntegrations?: InstalledIntegrationItem[];
}

export interface Tab {
  category: string;
  featuredCardNames?: Array<IntegrationCardItem['id']>;
  iconType?: string;
  id: IntegrationTabId;
  label: string;
  overflow?: 'hidden' | 'scroll';
  showSearchTools?: boolean;
  subCategory?: string;
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
  installedIntegrationsCount: number;
  isAgentRequired: boolean;
  selectedTabId: IntegrationTabId;
}>;

export type AvailablePackagesResult = Pick<
  ReturnType<AvailablePackagesHookType>,
  'isLoading' | 'searchTerm' | 'setCategory' | 'setSearchTerm' | 'setSelectedSubCategory'
>;

export type RenderChildrenType = React.FC<{
  allowedIntegrations: IntegrationCardItem[];
  availablePackagesResult: AvailablePackagesResult;
  checkCompleteMetadata?: IntegrationCardMetadata;
  featuredCardNames?: string[];
  selectedTabResult: UseSelectedTabReturn;
  topCalloutRenderer?: TopCalloutRenderer;
}>;
