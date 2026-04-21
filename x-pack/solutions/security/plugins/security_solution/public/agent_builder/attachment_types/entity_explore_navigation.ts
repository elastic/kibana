/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

import { EntityType } from '../../../common/entity_analytics/types';
import { ENTITY_ANALYTICS_HOME_PAGE_PATH, SecurityPageName } from '../../../common/constants';
import { getHostDetailsUrl } from '../../common/components/link_to/redirect_to_hosts';
import { getTabsOnUsersDetailsUrl } from '../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../explore/users/store/model';

/** Some tool payloads mistakenly set `entity_name` to the ECS field label "name". */
const INVALID_PLACEHOLDER_ENTITY_NAME = 'name';

const USER_EUID_PREFIX = 'user:';

/**
 * Same key as agent_builder `storageKeys.agentId` — last selected agent for the sidebar.
 * Passing this into `openChat` keeps `usePersistedConversationId` on the same storage bucket
 * as the active conversation (Agent Builder `updateProps` replaces props in full).
 */
const AGENT_BUILDER_LAST_AGENT_ID_STORAGE_KEY = 'agentBuilder.agentId';

const AGENT_BUILDER_SIDEBAR_APP_ID = 'agentBuilder' as const;

export type SecurityAgentBuilderChrome = CoreStart['chrome'];

/**
 * When the Agent Builder panel is already open, callers must not use `openChat` with new props:
 * the platform replaces embeddable props in full and drops the in-memory conversation/thread.
 */
export const isAgentBuilderSidebarOpen = (chrome?: SecurityAgentBuilderChrome): boolean =>
  chrome?.sidebar.getCurrentAppId() === AGENT_BUILDER_SIDEBAR_APP_ID;

/** Exported for unit tests — mirrors agent_builder `getLastAgentId` storage shape. */
export const getAgentBuilderLastAgentIdForSecurityOpenChat = (): string => {
  if (typeof window === 'undefined' || window.localStorage == null) {
    return agentBuilderDefaultAgentId;
  }
  const stored = window.localStorage.getItem(AGENT_BUILDER_LAST_AGENT_ID_STORAGE_KEY);
  if (stored == null || stored === '') {
    return agentBuilderDefaultAgentId;
  }
  try {
    return JSON.parse(stored) as string;
  } catch {
    return stored;
  }
};

const openSecurityAgentBuilderChatPreservingConversation = (
  agentBuilder: AgentBuilderPluginStart
): void => {
  agentBuilder.openChat({
    sessionTag: 'security',
    newConversation: false,
    agentId: getAgentBuilderLastAgentIdForSecurityOpenChat(),
  });
};

export interface SecurityEntityExploreRow {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  source?: unknown;
}

const readHostNameFromEntitySource = (source: unknown): string | undefined => {
  if (source == null || typeof source !== 'object' || Array.isArray(source)) {
    return undefined;
  }
  const host = (source as { host?: unknown }).host;
  if (host == null || typeof host !== 'object' || Array.isArray(host)) {
    return undefined;
  }
  const name = (host as { name?: unknown }).name;
  return typeof name === 'string' && name !== '' ? name : undefined;
};

const parseUserEuidLocalSegment = (entityId: string): string | undefined => {
  if (!entityId.startsWith(USER_EUID_PREFIX)) {
    return undefined;
  }
  const rest = entityId.slice(USER_EUID_PREFIX.length);
  const at = rest.indexOf('@');
  if (at <= 0) {
    return undefined;
  }
  return rest.slice(0, at);
};

/**
 * Resolves the `user.name`-style segment used in `/users/name/:name/events` routes.
 * Prefers `entity_name` from the entity store; falls back to EUID + optional `host.name` in `source`.
 */
export const getUserNameForUserDetailsUrl = (row: SecurityEntityExploreRow): string => {
  const trimmed = row.entity_name?.trim();
  if (trimmed && trimmed !== INVALID_PLACEHOLDER_ENTITY_NAME) {
    return trimmed;
  }

  const hostName = readHostNameFromEntitySource(row.source);
  const local = parseUserEuidLocalSegment(row.entity_id);
  if (local && hostName) {
    return `${local}@${hostName}`;
  }
  if (trimmed) {
    return trimmed;
  }
  if (local) {
    return local;
  }
  return row.entity_id;
};

export const getHostNameForHostDetailsUrl = (row: SecurityEntityExploreRow): string => {
  const trimmed = row.entity_name?.trim();
  if (trimmed && trimmed !== INVALID_PLACEHOLDER_ENTITY_NAME) {
    return trimmed;
  }
  if (trimmed) {
    return trimmed;
  }
  return row.entity_id;
};

/**
 * Path is relative to the Security hosts/users deep link (do not prefix with `/hosts` or `/users` —
 * `application.navigateToApp` already routes into those sections).
 */
export const getSecurityEntityExploreNavigateTarget = (
  row: SecurityEntityExploreRow
): { deepLinkId: string; path: string } => {
  if (row.entity_type === EntityType.host) {
    const displayName = getHostNameForHostDetailsUrl(row);
    return {
      deepLinkId: SecurityPageName.hosts,
      path: getHostDetailsUrl(displayName, undefined, row.entity_id),
    };
  }
  if (row.entity_type === EntityType.user) {
    const displayName = getUserNameForUserDetailsUrl(row);
    return {
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersDetailsUrl(displayName, UsersTableType.events, undefined, row.entity_id),
    };
  }
  return {
    deepLinkId: SecurityPageName.entityAnalyticsHomePage,
    path: ENTITY_ANALYTICS_HOME_PAGE_PATH,
  };
};

/**
 * Opens the Agent Builder conversation sidebar (same session as the rest of Security) when available,
 * then navigates to the entity page. Deferred navigation gives the sidebar a tick to mount so the
 * chat stays visible beside the new page.
 */
export const navigateToSecurityEntityInApp = ({
  application,
  appId,
  row,
  agentBuilder,
  chrome,
}: {
  application: ApplicationStart;
  appId: string;
  row: SecurityEntityExploreRow;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
}): void => {
  const { deepLinkId, path } = getSecurityEntityExploreNavigateTarget(row);
  const sidebarAlreadyOpen = isAgentBuilderSidebarOpen(chrome);
  if (agentBuilder?.openChat && !sidebarAlreadyOpen) {
    openSecurityAgentBuilderChatPreservingConversation(agentBuilder);
    setTimeout(() => {
      application.navigateToApp(appId, { deepLinkId, path });
    }, 0);
  } else {
    application.navigateToApp(appId, { deepLinkId, path });
  }
};

/**
 * Opens the Entity Analytics home page (same deep link as the product dashboard), optionally scoped to a watchlist.
 */
export const navigateToEntityAnalyticsHomePageInApp = ({
  application,
  appId,
  agentBuilder,
  chrome,
  watchlistId,
  watchlistName,
}: {
  application: ApplicationStart;
  appId: string;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  watchlistId?: string;
  watchlistName?: string;
}): void => {
  const params = new URLSearchParams();
  if (watchlistId) {
    params.set('watchlistId', watchlistId);
  }
  if (watchlistName) {
    params.set('watchlistName', watchlistName);
  }
  const query = params.toString();
  const path = query
    ? `${ENTITY_ANALYTICS_HOME_PAGE_PATH}?${query}`
    : ENTITY_ANALYTICS_HOME_PAGE_PATH;

  const sidebarAlreadyOpen = isAgentBuilderSidebarOpen(chrome);
  if (agentBuilder?.openChat && !sidebarAlreadyOpen) {
    openSecurityAgentBuilderChatPreservingConversation(agentBuilder);
    setTimeout(() => {
      application.navigateToApp(appId, {
        deepLinkId: SecurityPageName.entityAnalyticsHomePage,
        path,
      });
    }, 0);
  } else {
    application.navigateToApp(appId, {
      deepLinkId: SecurityPageName.entityAnalyticsHomePage,
      path,
    });
  }
};
