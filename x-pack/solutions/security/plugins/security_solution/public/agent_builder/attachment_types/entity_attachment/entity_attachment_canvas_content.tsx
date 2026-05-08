/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import { EuiPanel } from '@elastic/eui';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EntityAttachment } from './types';
import { isFlyoutCapableIdentifierType } from './types';
import { normaliseEntityAttachment } from './payload';
import { entityAttachmentQueryClient } from './query_client';
import { EntityCard } from './entity_card/entity_card';
import {
  SecurityReduxEmbeddedProvider,
  type SecurityCanvasEmbeddedBundle,
} from '../../components/security_redux_embedded_provider';
import { EntityCardFlyoutOverviewCanvas } from '../../components/entity_card_flyout_overview_canvas';
import type { SecurityAgentBuilderChrome } from '../entity_explore_navigation';

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
 *
 * This module is split into its own chunk (`security_entity_attachment_canvas`) via
 * `React.lazy` in `entity_attachment_definition.tsx`, so the heavy flyout/Redux dependencies
 * only load when the user clicks Preview.
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

  return (
    <SecurityReduxEmbeddedProvider resolveCanvasContext={resolveSecurityCanvasContext}>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
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
