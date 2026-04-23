/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ISessionService } from '@kbn/data-plugin/public';
import { encodeFlyout } from '@kbn/cloud-security-posture/src/utils/query_utils';
import {
  markPreserveAgentBuilderSessionDuringNextSecurityNavigation,
  readLastAgentBuilderAgentIdForSecuritySession,
} from '../../../common/agent_builder_navigation_gate';

import { EntityType } from '../../../common/entity_analytics/types';
import { SecurityPageName } from '../../../common/constants';
import { getHostDetailsUrl } from '../../common/components/link_to/redirect_to_hosts';
import { getTabsOnUsersDetailsUrl } from '../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../explore/users/store/model';

/** Some tool payloads mistakenly set `entity_name` to the ECS field label "name". */
const INVALID_PLACEHOLDER_ENTITY_NAME = 'name';

const USER_EUID_PREFIX = 'user:';

const AGENT_BUILDER_SIDEBAR_APP_ID = 'agentBuilder' as const;

export type SecurityAgentBuilderChrome = CoreStart['chrome'];

/**
 * True when the Chrome sidebar is showing the Agent Builder app (used to coordinate
 * close → navigate → reopen around in-app Security navigation).
 */
export const isAgentBuilderSidebarOpen = (chrome?: SecurityAgentBuilderChrome): boolean =>
  chrome?.sidebar.getCurrentAppId() === AGENT_BUILDER_SIDEBAR_APP_ID;

/** Exported for unit tests — mirrors agent_builder `getLastAgentId` storage shape. */
export const getAgentBuilderLastAgentIdForSecurityOpenChat =
  readLastAgentBuilderAgentIdForSecuritySession;

const openSecurityAgentBuilderChatPreservingConversation = (
  agentBuilder: AgentBuilderPluginStart
): void => {
  agentBuilder.openChat({
    sessionTag: 'security',
    newConversation: false,
    agentId: readLastAgentBuilderAgentIdForSecuritySession(),
  });
};

/**
 * Defers reopening the sidebar so `navigateToApp` can apply first (mirrors Dashboard Canvas
 * "Edit in Dashboards": navigate, then bring the conversation UI back on a fresh mount).
 */
const reopenSecurityAgentBuilderAfterNavigation = (agentBuilder: AgentBuilderPluginStart): void => {
  setTimeout(() => {
    openSecurityAgentBuilderChatPreservingConversation(agentBuilder);
  }, 0);
};

/**
 * After Security in-app navigation, restore the Agent Builder sidebar the same way Dashboard
 * Canvas does: prefer the attachment `openSidebarConversation` callback (persists the active
 * conversation id, then `openSidebarInternal`), otherwise fall back to `openChat` with the
 * Security session tag and last agent id.
 */
const scheduleReopenAgentBuilderAfterSecurityNavigation = ({
  agentBuilder,
  openSidebarConversation,
}: {
  agentBuilder?: AgentBuilderPluginStart;
  openSidebarConversation?: () => void;
}): void => {
  if (openSidebarConversation) {
    setTimeout(() => {
      openSidebarConversation();
    }, 0);
    return;
  }
  if (agentBuilder?.openChat) {
    reopenSecurityAgentBuilderAfterNavigation(agentBuilder);
  }
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
): { deepLinkId: string; path?: string } => {
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
  // `navigateToApp` appends `path` to the deep link's registered path. The EA home deep link
  // already uses `/entity_analytics_home_page`; passing it again produced a doubled segment,
  // no matching route, catch-all redirect to `/get_started`, then onboarding could send users to
  // SIEM migrations (e.g. `/get_started/siem_migrations` → `/siem_migrations/manage`).
  return {
    deepLinkId: SecurityPageName.entityAnalyticsHomePage,
  };
};

/**
 * Navigates to the entity page in Security, then reopens Agent Builder so the sidebar embeddable
 * remounts and restores the persisted conversation (same sequence as Dashboard Canvas
 * "Edit in Dashboards": primary navigation, then restore the chat surface).
 */
export const navigateToSecurityEntityInApp = ({
  application,
  appId,
  row,
  agentBuilder,
  chrome,
  openSidebarConversation,
  searchSession,
}: {
  application: ApplicationStart;
  appId: string;
  row: SecurityEntityExploreRow;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  /** When rendering from Agent Builder canvas, pass this for the same restore path as "Edit in Dashboards". */
  openSidebarConversation?: () => void;
  /**
   * Optional search session service. When provided, the active session is cleared before
   * navigating. See `clearSearchSessionBeforeSecurityNavigation` below for the rationale.
   */
  searchSession?: ISessionService;
}): void => {
  markPreserveAgentBuilderSessionDuringNextSecurityNavigation();
  const { deepLinkId, path } = getSecurityEntityExploreNavigateTarget(row);
  if (isAgentBuilderSidebarOpen(chrome) && agentBuilder?.toggleChat) {
    agentBuilder.toggleChat();
  }
  clearSearchSessionBeforeSecurityNavigation(searchSession);
  application.navigateToApp(appId, { deepLinkId, path, replace: true });
  scheduleReopenAgentBuilderAfterSecurityNavigation({ agentBuilder, openSidebarConversation });
};

/**
 * Opens the Entity Analytics home page (same deep link as the product dashboard), optionally scoped to a watchlist.
 */
/**
 * Opens Entity Analytics home with a serialized expandable-flyout state (same URL shape as the
 * product Entity Analytics page). Used from Agent Builder canvas where the in-page flyout
 * provider is not mounted on the attachment surface.
 */
export const navigateToEntityAnalyticsWithFlyoutInApp = ({
  application,
  appId,
  flyout,
  agentBuilder,
  chrome,
  openSidebarConversation,
  searchSession,
}: {
  application: ApplicationStart;
  appId: string;
  flyout: Record<string, unknown>;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  openSidebarConversation?: () => void;
  /**
   * Optional search session service. When provided, the active session is cleared before
   * navigating. See `clearSearchSessionBeforeSecurityNavigation` below for the rationale.
   */
  searchSession?: ISessionService;
}): void => {
  const encoded = encodeFlyout(flyout);
  if (encoded == null) {
    return;
  }
  markPreserveAgentBuilderSessionDuringNextSecurityNavigation();
  if (isAgentBuilderSidebarOpen(chrome) && agentBuilder?.toggleChat) {
    agentBuilder.toggleChat();
  }
  clearSearchSessionBeforeSecurityNavigation(searchSession);
  application.navigateToApp(appId, {
    deepLinkId: SecurityPageName.entityAnalyticsHomePage,
    path: `?${encoded}`,
    replace: true,
  });
  scheduleReopenAgentBuilderAfterSecurityNavigation({ agentBuilder, openSidebarConversation });
};

export const navigateToEntityAnalyticsHomePageInApp = ({
  application,
  appId,
  agentBuilder,
  chrome,
  openSidebarConversation,
  watchlistId,
  watchlistName,
  searchSession,
}: {
  application: ApplicationStart;
  appId: string;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  openSidebarConversation?: () => void;
  watchlistId?: string;
  watchlistName?: string;
  /**
   * Optional search session service. When provided, the active session is cleared before
   * navigating. See `clearSearchSessionBeforeSecurityNavigation` below for the rationale.
   */
  searchSession?: ISessionService;
}): void => {
  const params = new URLSearchParams();
  if (watchlistId) {
    params.set('watchlistId', watchlistId);
  }
  if (watchlistName) {
    params.set('watchlistName', watchlistName);
  }
  const query = params.toString();
  const path = query === '' ? undefined : `?${query}`;

  markPreserveAgentBuilderSessionDuringNextSecurityNavigation();
  if (isAgentBuilderSidebarOpen(chrome) && agentBuilder?.toggleChat) {
    agentBuilder.toggleChat();
  }
  clearSearchSessionBeforeSecurityNavigation(searchSession);
  application.navigateToApp(appId, {
    deepLinkId: SecurityPageName.entityAnalyticsHomePage,
    path,
    replace: true,
  });
  scheduleReopenAgentBuilderAfterSecurityNavigation({ agentBuilder, openSidebarConversation });
};

/**
 * Navigating from `agent_builder` to `securitySolutionUI` is a legitimate cross-app jump
 * triggered from the Canvas preview (Graph / Resolution / Open in Security / Open in Entity
 * Analytics). Lens embeddables rendered inside the Canvas start a search session tagged with
 * `appName: 'agent_builder'`; leaving it open when `currentAppId$` flips to
 * `securitySolutionUI` trips the platform guard in
 * `data/public/search/session/session_service.ts` and throws a fatal in dev.
 *
 * Clearing the session here keeps the navigation honest without regressing the
 * minimized-sidebar case: when called from within Security the owner and current app match,
 * so `SessionService.clear()` either succeeds as a benign reset (matching the Security
 * `renderApp` unmount hygiene) or is a no-op when no session is active.
 */
const clearSearchSessionBeforeSecurityNavigation = (searchSession?: ISessionService): void => {
  searchSession?.clear();
};
