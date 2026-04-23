/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { APP_UI_ID } from '../../../../../common/constants';
import {
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from '../../../../flyout/entity_details/shared/constants';
import type { EntityAttachmentIdentifier } from '../types';
import { isFlyoutCapableIdentifierType } from '../types';
import {
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
} from '../../entity_explore_navigation';

interface EntityCardActionsProps {
  identifier: EntityAttachmentIdentifier;
  /**
   * Optional core `ApplicationStart`. When provided, the "Open in Entity Analytics" button
   * routes through the shared `navigateTo…InApp` helpers, which clear any active
   * Agent Builder-tagged search session before the cross-app jump. When omitted, falls back
   * to `useKibana()` so existing call sites / tests without an explicit `application` prop
   * keep working.
   */
  application?: ApplicationStart;
  /**
   * Optional search session service. Forwarded to the shared `navigateTo…InApp` helpers
   * so the active search session tagged with `appName: 'agent_builder'` is cleared before
   * the legitimate cross-app navigation to `securitySolutionUI`.
   */
  searchSession?: ISessionService;
}

/**
 * Scope shared with the Canvas entity card (see `entity_card_flyout_overview_canvas.tsx`).
 * Kept in sync so the flyout provider resolves the same `contextID` / `scopeId` regardless
 * of whether the flyout is opened from the inline chat card or the Canvas preview.
 */
const AGENT_BUILDER_ENTITY_CARD_SCOPE = 'agent-builder-entity-card';

const OPEN_IN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.openInEntityAnalytics',
  { defaultMessage: 'Open in Entity Analytics' }
);

const OPEN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.openEntityAnalytics',
  { defaultMessage: 'Open Entity Analytics' }
);

type EntityFlyoutRightPanel =
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
 * to an unfiltered navigation in those cases.
 */
const buildEntityRightPanel = (
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

/**
 * Follow-up action row rendered at the bottom of the entity card. The only
 * affordance is a jump into the Entity Analytics app: for host/user/service
 * entities backed by the entity store we deep-link straight into the
 * expandable flyout (same `?flyout=…` payload shape the EA page emits
 * itself), otherwise we fall back to the unfiltered EA home page and adjust
 * the label from "Open in Entity Analytics" to "Open Entity Analytics" so
 * the copy matches the navigation target.
 */
export const EntityCardActions: React.FC<EntityCardActionsProps> = ({
  identifier,
  application,
  searchSession,
}) => {
  const { services } = useKibana<{ application: ApplicationStart }>();
  const effectiveApplication = application ?? services.application;

  const rightPanel = useMemo(() => buildEntityRightPanel(identifier), [identifier]);

  const label = rightPanel ? OPEN_IN_ENTITY_ANALYTICS_LABEL : OPEN_ENTITY_ANALYTICS_LABEL;

  const handleOpenEntityAnalytics = useCallback(() => {
    if (!effectiveApplication) {
      return;
    }
    if (rightPanel) {
      navigateToEntityAnalyticsWithFlyoutInApp({
        application: effectiveApplication,
        appId: APP_UI_ID,
        searchSession,
        flyout: { preview: [], right: rightPanel },
      });
      return;
    }
    navigateToEntityAnalyticsHomePageInApp({
      application: effectiveApplication,
      appId: APP_UI_ID,
      searchSession,
    });
  }, [effectiveApplication, rightPanel, searchSession]);

  return (
    <div data-test-subj="entityAttachmentCardActions">
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="popout"
            onClick={handleOpenEntityAnalytics}
            data-test-subj="entityAttachmentOpenEntityAnalyticsAction"
            aria-label={label}
          >
            {label}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
