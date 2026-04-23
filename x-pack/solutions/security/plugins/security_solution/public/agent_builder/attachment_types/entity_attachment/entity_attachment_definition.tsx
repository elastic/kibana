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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ISessionService } from '@kbn/data-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSkeletonText } from '@elastic/eui';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { APP_UI_ID } from '../../../../common/constants';
import type { EntityAttachment } from './types';
import { isFlyoutCapableIdentifierType } from './types';
import { normaliseEntityAttachment } from './payload';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import {
  navigateToSecurityEntityInApp,
  type SecurityAgentBuilderChrome,
} from '../entity_explore_navigation';

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

const OPEN_IN_SECURITY_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entity.openInSecurity',
  { defaultMessage: 'Open in Security' }
);

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
 * Only installed when the `entityAttachmentRichRenderer` experimental flag is
 * on; otherwise the minimal label-only config in `attachment_types/index.ts`
 * remains active.
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
      <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
        <LazyEntityAttachmentInlineContent
          {...props}
          experimentalFeatures={experimentalFeatures}
          application={application}
          agentBuilder={agentBuilder}
          chrome={chrome}
          searchSession={searchSession}
        />
      </React.Suspense>
    ),
  };

  if (application == null || resolveSecurityCanvasContext == null) {
    return baseDefinition;
  }

  const resolvedApplication = application;
  const resolvedResolveCanvasContext = resolveSecurityCanvasContext;

  return {
    ...baseDefinition,
    renderCanvasContent: (props: AttachmentRenderProps<EntityAttachment>) => (
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
            label: OPEN_IN_SECURITY_LABEL,
            icon: 'popout',
            type: ActionButtonType.SECONDARY,
            handler: () => {
              navigateToSecurityEntityInApp({
                application: resolvedApplication,
                appId: APP_UI_ID,
                row: {
                  entity_type: identifier.identifierType,
                  entity_id: identifier.entityStoreId ?? identifier.identifier,
                  entity_name: identifier.identifier,
                },
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
