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
import { QueryClientProvider } from '@kbn/react-query';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { APP_UI_ID } from '../../../../common/constants';
import type { EntityAttachment } from './types';
import { normaliseEntityAttachment } from './payload';
import { EntityAttachmentInlineContent } from './entity_attachment_inline_content';
import { entityAttachmentQueryClient } from './query_client';
import { EntityCard } from './entity_card/entity_card';
import {
  SecurityReduxEmbeddedProvider,
  type SecurityCanvasEmbeddedBundle,
} from '../../components/security_redux_embedded_provider';
import { EntityCardFlyoutOverviewCanvas } from '../../components/entity_card_flyout_overview_canvas';
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

const isFlyoutCapableIdentifierType = (
  identifierType: string | undefined
): identifierType is 'host' | 'user' | 'service' =>
  identifierType === 'host' || identifierType === 'user' || identifierType === 'service';

export interface EntityAttachmentCanvasContentProps
  extends AttachmentRenderProps<EntityAttachment> {
  experimentalFeatures: ExperimentalFeatures;
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  searchSession?: ISessionService;
}

/**
 * Canvas (Preview) view for single-entity `security.entity` attachments. Mounts the full
 * Security expandable-flyout overview inside `SecurityReduxEmbeddedProvider` so the same hooks
 * (`useGlobalTime`, `useRiskScore`, `useObservedHost`, sourcerer, …) that power the in-app flyout
 * work on the Agent Builder canvas surface.
 *
 * Multi-entity attachments intentionally bypass the canvas and keep the inline `EntityTable` —
 * per-row Explore links cover navigation without needing a separate canvas.
 */
export const EntityAttachmentCanvasContent: React.FC<EntityAttachmentCanvasContentProps> = ({
  attachment,
  experimentalFeatures,
  application,
  agentBuilder,
  chrome,
  resolveSecurityCanvasContext,
  openSidebarConversation,
  searchSession,
}) => {
  const parsed = normaliseEntityAttachment(attachment);
  const watchlistsEnabled = experimentalFeatures.entityAnalyticsWatchlistEnabled;
  const privmonModifierEnabled = experimentalFeatures.enableRiskScorePrivmonModifier;

  if (!parsed || !parsed.isSingle) {
    return (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <QueryClientProvider client={entityAttachmentQueryClient}>
          {parsed?.isSingle === false ? null : parsed ? (
            <EntityCard
              identifier={parsed.entities[0]}
              riskStats={parsed.riskStats}
              resolutionRiskStats={parsed.resolutionRiskStats}
              watchlistsEnabled={watchlistsEnabled}
              privmonModifierEnabled={privmonModifierEnabled}
            />
          ) : null}
        </QueryClientProvider>
      </EuiPanel>
    );
  }

  const identifier = parsed.entities[0];
  if (!isFlyoutCapableIdentifierType(identifier.identifierType)) {
    return (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <QueryClientProvider client={entityAttachmentQueryClient}>
          <EntityCard
            identifier={identifier}
            riskStats={parsed.riskStats}
            resolutionRiskStats={parsed.resolutionRiskStats}
            watchlistsEnabled={watchlistsEnabled}
            privmonModifierEnabled={privmonModifierEnabled}
          />
        </QueryClientProvider>
      </EuiPanel>
    );
  }

  const handleOpenInSecurity = () => {
    navigateToSecurityEntityInApp({
      application,
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
  };

  return (
    <SecurityReduxEmbeddedProvider resolveCanvasContext={resolveSecurityCanvasContext}>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="popout"
              iconSide="right"
              onClick={handleOpenInSecurity}
              data-test-subj="entityAttachmentCanvasOpenInSecurity"
            >
              {OPEN_IN_SECURITY_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <QueryClientProvider client={entityAttachmentQueryClient}>
          <EntityCardFlyoutOverviewCanvas
            identifier={identifier}
            application={application}
            agentBuilder={agentBuilder}
            chrome={chrome}
            openSidebarConversation={openSidebarConversation}
            searchSession={searchSession}
          />
        </QueryClientProvider>
      </EuiPanel>
    </SecurityReduxEmbeddedProvider>
  );
};

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
  const canRenderCanvas = application != null && resolveSecurityCanvasContext != null;

  return {
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
      <EntityAttachmentInlineContent
        {...props}
        experimentalFeatures={experimentalFeatures}
        application={application}
        agentBuilder={agentBuilder}
        chrome={chrome}
        searchSession={searchSession}
      />
    ),
    ...(canRenderCanvas
      ? {
          renderCanvasContent: (props: AttachmentRenderProps<EntityAttachment>) => (
            <EntityAttachmentCanvasContent
              {...props}
              experimentalFeatures={experimentalFeatures}
              application={application!}
              agentBuilder={agentBuilder}
              chrome={chrome}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext!}
              searchSession={searchSession}
            />
          ),
          getActionButtons: ({ attachment, isCanvas, openCanvas }) => {
            if (isCanvas || !openCanvas) {
              return [];
            }
            const parsed = normaliseEntityAttachment(attachment);
            if (!parsed || !parsed.isSingle) {
              return [];
            }
            const identifier = parsed.entities[0];
            if (!isFlyoutCapableIdentifierType(identifier.identifierType)) {
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
        }
      : {}),
  };
};
