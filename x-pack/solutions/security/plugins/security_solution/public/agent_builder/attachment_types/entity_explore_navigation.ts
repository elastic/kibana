/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { encodeFlyout, FLYOUT_PARAM_KEY } from '@kbn/cloud-security-posture/src/utils/query_utils';
import {
  markPreserveAgentBuilderSessionDuringNextSecurityNavigation,
  readLastAgentBuilderAgentIdForSecuritySession,
} from '../../../common/agent_builder_navigation_gate';

import { SecurityPageName } from '../../../common/constants';
import {
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from '../../flyout/entity_details/shared/constants';
import type { EntityAttachmentIdentifier } from './entity_attachment/types';
import { isFlyoutCapableIdentifierType } from './entity_attachment/types';

/** Some tool payloads mistakenly set `entity_name` to the ECS field label "name". */
const INVALID_PLACEHOLDER_ENTITY_NAME = 'name';

const USER_EUID_PREFIX = 'user:';

const AGENT_BUILDER_SIDEBAR_APP_ID = 'agentBuilder' as const;
const ENTITY_ANALYTICS_HOME_PATH = '/entity_analytics_home_page';

const getEntityAnalyticsStateSearchParams = (): URLSearchParams => {
  if (!window.location.pathname.includes(ENTITY_ANALYTICS_HOME_PATH)) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
};

const getEntityAnalyticsNavigationPathWithFlyout = (
  flyout: Record<string, unknown>
): string | undefined => {
  const encodedFlyoutSearch = encodeFlyout(flyout);
  if (encodedFlyoutSearch == null) {
    return undefined;
  }

  const flyoutValue = new URLSearchParams(encodedFlyoutSearch).get(FLYOUT_PARAM_KEY);
  if (flyoutValue == null) {
    return undefined;
  }

  const searchParams = getEntityAnalyticsStateSearchParams();
  searchParams.set(FLYOUT_PARAM_KEY, flyoutValue);
  return `?${searchParams.toString()}`;
};

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

/**
 * Scope shared by the Agent Builder entity surfaces (inline card, canvas flyout
 * overview, canvas action button, entity tables). Kept in sync so the Security
 * expandable flyout provider resolves the same `contextID` / `scopeId`
 * regardless of which surface opened it.
 */
export const AGENT_BUILDER_ENTITY_CARD_SCOPE = 'agent-builder-entity-card';

/**
 * Minimal expandable-flyout `right` panel shape accepted by the Entity Analytics
 * home page. Kept intentionally narrow so consumers can't accidentally forward
 * unrelated panel payloads.
 */
export type EntityFlyoutRightPanel =
  | {
      id: typeof HostPanelKey;
      params: { contextID: string; scopeId: string; hostName: string; entityId: string };
    }
  | {
      id: typeof UserPanelKey;
      params: {
        contextID: string;
        scopeId: string;
        userName: string;
        identityFields: { 'user.name': string };
        entityId: string;
      };
    }
  | {
      id: typeof ServicePanelKey;
      params: { contextID: string; scopeId: string; serviceName: string; entityId: string };
    };

/**
 * Builds the minimal `right`-panel payload consumed by the expandable flyout provider on the
 * Entity Analytics home page. Returns `null` for generic entities (no dedicated flyout yet)
 * and for legacy attachments that don't carry the canonical `entity.id` — callers fall back
 * to an unfiltered `navigateToEntityAnalyticsHomePageInApp` in those cases.
 */
export const buildEntityRightPanel = (
  identifier: EntityAttachmentIdentifier
): EntityFlyoutRightPanel | null => {
  const { identifierType, identifier: displayName, entityStoreId } = identifier;
  if (!entityStoreId || !isFlyoutCapableIdentifierType(identifierType)) {
    return null;
  }

  const contextID = AGENT_BUILDER_ENTITY_CARD_SCOPE;
  const scopeId = AGENT_BUILDER_ENTITY_CARD_SCOPE;

  switch (identifierType) {
    case 'host':
      return {
        id: HostPanelKey,
        params: { contextID, scopeId, hostName: displayName, entityId: entityStoreId },
      };
    case 'user':
      return {
        id: UserPanelKey,
        params: {
          contextID,
          scopeId,
          userName: displayName,
          identityFields: { 'user.name': displayName },
          entityId: entityStoreId,
        },
      };
    case 'service':
      return {
        id: ServicePanelKey,
        params: { contextID, scopeId, serviceName: displayName, entityId: entityStoreId },
      };
    default:
      return null;
  }
};

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
  return row.entity_id;
};

export const getServiceNameForServiceDetailsUrl = (row: SecurityEntityExploreRow): string => {
  const trimmed = row.entity_name?.trim();
  if (trimmed && trimmed !== INVALID_PLACEHOLDER_ENTITY_NAME) {
    return trimmed;
  }
  return row.entity_id;
};

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
  const path = getEntityAnalyticsNavigationPathWithFlyout(flyout);
  if (path == null) {
    return;
  }

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
