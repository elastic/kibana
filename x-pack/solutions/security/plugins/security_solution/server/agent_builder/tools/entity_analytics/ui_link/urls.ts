/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import {
  APP_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_HOME_PAGE_PATH,
} from '../../../../../common/constants';

// Server code can't import from public/, so these mirror public-side constants by value.
// urls.test.ts asserts they stay in sync with the real constants.
export const RESOLUTION_GROUP_TAB = 'resolution_group';
export const WATCHLISTS_FLYOUT_KEY = 'watchlists-flyout';
// Flyout `scopeId` / `contextID`. We use the id the Entity Analytics home page's own entities table
// passes (`ENTITY_ANALYTICS_TABLE_ID`), since the deep-link opens the flyout on that page.
export const ENTITY_ANALYTICS_HOME_TABLE_SCOPE = 'entity-analytics-home-table';

export const ENTITY_RESOLUTION_PANEL = {
  host: { right: 'host-panel', left: 'host_details' },
  user: { right: 'user-panel', left: 'user_details' },
  service: { right: 'service-panel', left: 'service_details' },
} as const;

export type EntityResolutionType = keyof typeof ENTITY_RESOLUTION_PANEL;

export type BuildUiLinkArgs =
  | { intent: 'entity_analytics_settings' }
  | { intent: 'risk_engine_settings' }
  | { intent: 'asset_criticality_bulk' }
  | { intent: 'entity_resolution_bulk' }
  | { intent: 'engine_status' }
  | { intent: 'watchlists_list' }
  | { intent: 'watchlist_edit'; watchlistId: string }
  | {
      intent: 'entity_resolution';
      entityType: EntityResolutionType;
      entityId: string;
      entityName?: string;
    };

export type BuildUiLinkIntent = BuildUiLinkArgs['intent'];

const MANAGEMENT_BASE = `${APP_PATH}${ENTITY_ANALYTICS_MANAGEMENT_PATH}`;
const HOME_PAGE_BASE = `${APP_PATH}${ENTITY_ANALYTICS_HOME_PAGE_PATH}`;

/**
 * Serializes an expandable-flyout state object into the `flyout=<rison>` query param.
 *
 * Two encodings are applied, and they reverse on read:
 * 1. **Rison** (`encode`) turns the state object into the compact wire format the expandable
 *    flyout reads back (it rison-decodes the `flyout` param).
 * 2. **Percent-encoding** makes that Rison string a valid URL query value. We additionally
 *    escape the characters `encodeURIComponent` leaves raw (`! ' ( ) *`): the URL is emitted
 *    inside a markdown link `[title](url)`, where literal parentheses/quotes break the link
 *    parser (it renders as plain text). Rison quotes any value containing `: @ .` with single
 *    quotes, so entity EUIDs routinely produce `'`, `(`, and `)` here.
 *
 * On read, `new URLSearchParams(search).get('flyout')` percent-decodes, then the flyout code
 * rison-decodes — so both encodings reverse cleanly.
 */
const flyoutParam = (flyout: Record<string, unknown>): string => {
  const encoded = encodeURIComponent(encode(flyout)).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `flyout=${encoded}`;
};

/**
 * Builds the left+right expandable-flyout state that opens a specific entity's detail
 * panel directly on its Resolution ("Add entities to resolution group") tab
 */
const buildResolutionFlyout = (args: {
  entityType: EntityResolutionType;
  entityId: string;
  entityName?: string;
}): Record<string, unknown> => {
  const { entityType, entityName, entityId } = args;
  const { right, left } = ENTITY_RESOLUTION_PANEL[entityType];
  const scopeId = ENTITY_ANALYTICS_HOME_TABLE_SCOPE;
  const contextID = ENTITY_ANALYTICS_HOME_TABLE_SCOPE;
  const path = { tab: RESOLUTION_GROUP_TAB };
  const entityStoreEntityId = entityId;

  const nameField = (key: 'hostName' | 'userName' | 'serviceName') =>
    entityName ? { [key]: entityName } : {};
  const identityField = (field: 'user.name' | 'service.name') =>
    entityName ? { identityFields: { [field]: entityName } } : {};

  switch (entityType) {
    case 'host':
      return {
        left: {
          id: left,
          params: {
            entityId,
            ...nameField('hostName'),
            scopeId,
            isRiskScoreExist: true,
            path,
            hasMisconfigurationFindings: false,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
            entityStoreEntityId,
          },
        },
        right: {
          id: right,
          params: { contextID, scopeId, ...nameField('hostName'), entityId },
        },
      };
    case 'user':
      return {
        left: {
          id: left,
          params: {
            ...nameField('userName'),
            ...identityField('user.name'),
            isRiskScoreExist: true,
            scopeId,
            path,
            entityId,
            hasMisconfigurationFindings: false,
            hasNonClosedAlerts: false,
            entityStoreEntityId,
          },
        },
        right: {
          id: right,
          params: {
            contextID,
            ...nameField('userName'),
            ...identityField('user.name'),
            entityId,
            scopeId,
          },
        },
      };
    case 'service':
      return {
        left: {
          id: left,
          params: {
            isRiskScoreExist: true,
            ...identityField('service.name'),
            scopeId,
            entityId,
            ...nameField('serviceName'),
            entityStoreEntityId,
            path,
          },
        },
        right: {
          id: right,
          params: { contextID, scopeId, entityId, ...nameField('serviceName') },
        },
      };
  }
};

/**
 * Builds the **app-relative** Security UI path for a navigation intent, e.g.
 * `/app/security/entity_analytics_management/risk_score`
 */
const buildUiLinkPath = (args: BuildUiLinkArgs): string => {
  switch (args.intent) {
    case 'entity_analytics_settings':
      return MANAGEMENT_BASE;
    case 'risk_engine_settings':
      return `${MANAGEMENT_BASE}/risk_score`;
    case 'asset_criticality_bulk':
      return `${MANAGEMENT_BASE}/asset_criticality`;
    case 'entity_resolution_bulk':
      return `${MANAGEMENT_BASE}/entity_resolution`;
    case 'engine_status':
      return `${MANAGEMENT_BASE}/status`;
    case 'watchlists_list':
      return `${MANAGEMENT_BASE}/watchlists`;
    case 'watchlist_edit':
      return `${MANAGEMENT_BASE}/watchlists?${flyoutParam({
        right: {
          id: WATCHLISTS_FLYOUT_KEY,
          params: { mode: 'edit', watchlistId: args.watchlistId },
        },
      })}`;
    case 'entity_resolution':
      return `${HOME_PAGE_BASE}?${flyoutParam(buildResolutionFlyout(args))}`;
  }
};

/**
 * Builds the final internal Security UI URL for a navigation intent, prefixed with the
 * server base path and the active space segment
 */
export const buildUiLinkUrl = (
  serverBasePath: string,
  spaceId: string,
  args: BuildUiLinkArgs
): string => addSpaceIdToPath(serverBasePath, spaceId, buildUiLinkPath(args));
