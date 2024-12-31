/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';

import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../common/constants';
import type { ProductAccess } from '../../../common/types';

import { ADD, UPDATE } from './constants/operations';

export type TOperation = typeof ADD | typeof UPDATE;

export interface RoleRules {
  username?: string;
  role?: string;
  email?: string;
  metadata?: string;
}

export interface AttributeExamples {
  username: string;
  email: string;
  metadata: string;
}

export type AttributeName = keyof AttributeExamples | 'role';

export interface RoleMapping {
  id: string;
  attributeName: AttributeName;
  attributeValue: string;
  authProvider: string[];
  roleType: string;
  rules: RoleRules;
  toolTip?: {
    content: string;
  };
}

export type ProductName = typeof APP_SEARCH_PLUGIN.NAME | typeof WORKPLACE_SEARCH_PLUGIN.NAME;

export interface Invitation {
  email: string;
  code: string;
}

export interface ElasticsearchUser {
  email: string | null;
  username: string;
  enabled: boolean;
}

export interface SingleUserRoleMapping<T> {
  invitation: Invitation | null;
  elasticsearchUser: ElasticsearchUser;
  roleMapping: T;
  hasEnterpriseSearchRole?: boolean;
}

export interface ReactRouterProps {
  to: string;
  onClick?(): void;
  // Used to navigate outside of the React Router plugin basename but still within Kibana,
  // e.g. if we need to go from Enterprise Search to App Search
  shouldNotCreateHref?: boolean;
  // Used if to is already a fully qualified URL that doesn't need basePath prepended
  shouldNotPrepend?: boolean;
}

export type GenerateNavLinkParameters = {
  items?: Array<EuiSideNavItemTypeEnhanced<unknown>>; // Primarily passed if using `items` to determine isSelected - if not, you can just set `items` outside of this helper
  shouldShowActiveForSubroutes?: boolean;
  to: string;
} & ReactRouterProps;

export interface GenerateNavLinkFromDeepLinkParameters {
  link: AppDeepLinkId;
  shouldShowActiveForSubroutes?: boolean;
}

export interface BuildClassicNavParameters {
  productAccess: ProductAccess;
}
