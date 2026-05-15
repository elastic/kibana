/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSkeletonText } from '@elastic/eui';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EntityAttachment } from './types';
import { isFlyoutCapableIdentifierType } from './types';
import { normaliseEntityAttachment } from './payload';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import {
  buildEntityRightPanel,
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
  type SecurityAgentBuilderChrome,
} from '../entity_explore_navigation';
import { EntityAnalyticsAgentNavigationProvider } from '../entity_analytics_agent_navigation_context';
import { APP_UI_ID } from '../../../../common/constants';

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entity.label',
  { defaultMessage: 'Risk Entity' }
);

const DEFAULT_LABEL_PLURAL = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.labelPlural', {
    defaultMessage: '{count} Risk Entities',
    values: { count },
  });

const PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entity.preview',
  { defaultMessage: 'Preview' }
);

const OPEN_IN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entity.openInEntityAnalytics',
  { defaultMessage: 'Open in Entity Analytics' }
);

/**
 * Preferred width for the entity flyout canvas. The rendered content is the Security
 * expandable-flyout overview (`HostPanelContent` / `UserPanelContent` / `ServicePanelContent`)
 * which is designed for a narrow rail; at the default `50vw` the entity summary grid and
 * highlights look over-stretched on wide monitors. Narrowing the canvas keeps parity with
 * the in-app flyout look.
 */
const ENTITY_CANVAS_WIDTH = '640px';

/**
 * Lazy-loaded inline renderer — pulls `EntityAttachmentInlineContent` (entity card / table)
 * into its own chunk so the main `securitySolution` entry bundle doesn't pick up the entity
 * analytics card + table dependencies until an attachment is actually rendered in the chat.
 */
const LazyEntityAttachmentInlineContent = React.lazy(() =>
  import(
    /* webpackChunkName: "security_entity_attachment_inline" */
    './entity_attachment_inline_content'
  ).then((m) => ({ default: m.EntityAttachmentInlineContent }))
);

/**
 * Lazy-loaded canvas renderer — pulls `SecurityReduxEmbeddedProvider`,
 * `EntityCardFlyoutOverviewCanvas`, and the full Security expandable-flyout overview into a
 * separate chunk. This chunk only downloads when the user clicks the `Preview` action button,
 * keeping the page-load bundle lean for users who never open an entity canvas.
 */
const LazyEntityAttachmentCanvasContent = React.lazy(() =>
  import(
    /* webpackChunkName: "security_entity_attachment_canvas" */
    './entity_attachment_canvas_content'
  ).then((m) => ({ default: m.EntityAttachmentCanvasContent }))
);

/**
 * Builds the rich `AttachmentUIDefinition` for `security.entity` attachments.
 *
 * When `application` + `resolveSecurityCanvasContext` are provided, the definition also adds a
 * Canvas (Preview) view for single host/user/service entities. Multi-entity attachments keep the
 * inline-only rendering path; navigation is handled via per-row Explore icons in the table.
 */
export const createEntityAttachmentDefinition = ({
  experimentalFeatures,
  application,
  agentBuilder,
  chrome,
  resolveSecurityCanvasContext,
  searchSession,
}: {
  experimentalFeatures: ExperimentalFeatures;
  application?: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  resolveSecurityCanvasContext?: () => Promise<SecurityCanvasEmbeddedBundle>;
  searchSession?: ISessionService;
}): AttachmentUIDefinition<EntityAttachment> => {
  const baseDefinition: AttachmentUIDefinition<EntityAttachment> = {
    getLabel: (attachment) => {
      const customLabel = attachment?.data?.attachmentLabel;
      if (customLabel) return customLabel;
      const parsed = normaliseEntityAttachment(attachment);
      if (!parsed) return DEFAULT_LABEL;
      if (parsed.isSingle) return DEFAULT_LABEL;
      return DEFAULT_LABEL_PLURAL(parsed.entities.length);
    },
    getIcon: () => 'user',
    renderInlineContent: (props) => (
      <EntityAnalyticsAgentNavigationProvider
        application={application}
        agentBuilder={agentBuilder}
        chrome={chrome}
        openSidebarConversation={props.openSidebarConversation}
        searchSession={searchSession}
      >
        <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
          <LazyEntityAttachmentInlineContent
            {...props}
            experimentalFeatures={experimentalFeatures}
          />
        </React.Suspense>
      </EntityAnalyticsAgentNavigationProvider>
    ),
  };

  if (application == null || resolveSecurityCanvasContext == null) {
    return baseDefinition;
  }

  const resolvedApplication = application;
  const resolvedResolveCanvasContext = resolveSecurityCanvasContext;

  return {
    ...baseDefinition,
    canvasWidth: ENTITY_CANVAS_WIDTH,
    renderCanvasContent: (props: AttachmentRenderProps<EntityAttachment>) => (
      <EntityAnalyticsAgentNavigationProvider
        application={resolvedApplication}
        agentBuilder={agentBuilder}
        chrome={chrome}
        openSidebarConversation={props.openSidebarConversation}
        searchSession={searchSession}
      >
        <React.Suspense
          fallback={
            <EuiFlexGroup alignItems="center" justifyContent="center" css={{ minHeight: 200 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <LazyEntityAttachmentCanvasContent
            {...props}
            experimentalFeatures={experimentalFeatures}
            application={resolvedApplication}
            agentBuilder={agentBuilder}
            chrome={chrome}
            resolveSecurityCanvasContext={resolvedResolveCanvasContext}
            searchSession={searchSession}
          />
        </React.Suspense>
      </EntityAnalyticsAgentNavigationProvider>
    ),
    getActionButtons: ({ attachment, isCanvas, openCanvas, openSidebarConversation }) => {
      const parsed = normaliseEntityAttachment(attachment);
      if (!parsed || !parsed.isSingle) {
        return [];
      }
      const identifier = parsed.entities[0];
      if (!isFlyoutCapableIdentifierType(identifier.identifierType)) {
        return [];
      }
      if (isCanvas) {
        return [
          {
            label: OPEN_IN_ENTITY_ANALYTICS_LABEL,
            icon: 'popout',
            type: ActionButtonType.SECONDARY,
            handler: () => {
              const rightPanel = buildEntityRightPanel(identifier);
              if (rightPanel) {
                navigateToEntityAnalyticsWithFlyoutInApp({
                  application: resolvedApplication,
                  appId: APP_UI_ID,
                  flyout: { preview: [], right: rightPanel },
                  agentBuilder,
                  chrome,
                  openSidebarConversation,
                  searchSession,
                });
                return;
              }
              navigateToEntityAnalyticsHomePageInApp({
                application: resolvedApplication,
                appId: APP_UI_ID,
                agentBuilder,
                chrome,
                openSidebarConversation,
                searchSession,
              });
            },
          },
        ];
      }
      if (!openCanvas) {
        return [];
      }
      return [
        {
          label: PREVIEW_LABEL,
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        },
      ];
    },
  };
};
