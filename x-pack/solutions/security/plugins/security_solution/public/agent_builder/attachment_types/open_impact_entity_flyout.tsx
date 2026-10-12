/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { QueryClientProvider } from '@kbn/react-query';
import { entityStoreIdType, type ImpactEntityTarget } from '@kbn/agentic-investigations-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { EntityCardFlyoutOverviewCanvas } from '../components/entity_card_flyout_overview_canvas';
import {
  SecurityReduxEmbeddedProvider,
  type SecurityCanvasEmbeddedBundle,
} from '../components/security_redux_embedded_provider';
import { EntityAnalyticsAgentNavigationProvider } from './entity_analytics_agent_navigation_context';
import type { SecurityAgentBuilderChrome } from './entity_explore_navigation';
import { entityAttachmentQueryClient } from './entity_attachment/query_client';

const flyoutType = (entity: ImpactEntityTarget): 'host' | 'user' | 'service' | undefined =>
  entityStoreIdType(entity.id);

/**
 * Opens the entity overview as a child of the investigation details flyout. The current app stays
 * put; Back on the entity flyout returns to the conversation.
 */
export const openImpactEntityFlyout = ({
  entity,
  overlays,
  application,
  agentBuilder,
  chrome,
  isNewFlyoutEnabled,
  resolveSecurityCanvasContext,
  searchSession,
}: {
  entity: ImpactEntityTarget;
  overlays: Pick<OverlayStart, 'openFlyoutTemplate'>;
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  isNewFlyoutEnabled: boolean;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  searchSession?: ISessionService;
}): void => {
  const identifierType = flyoutType(entity);
  if (!identifierType) {
    return;
  }

  const title = entity.name ?? entity.id;

  overlays.openFlyoutTemplate(
    {
      id: 'securityImpactEntityFlyout',
      session: 'inherit',
      size: 'm',
      type: 'overlay',
      // The entity overview renders its own header, so the history entry is titled here.
      flyoutMenuProps: { title },
      'aria-label': title,
      'data-test-subj': 'securityImpactEntityFlyout',
    },
    ({ onClose }) => (
      <FlyoutTemplate onClose={onClose}>
        <FlyoutTemplate.Body>
          {/* The overview's detail links navigate through this context; without it they do nothing. */}
          <EntityAnalyticsAgentNavigationProvider
            application={application}
            agentBuilder={agentBuilder}
            chrome={chrome}
            searchSession={searchSession}
            isNewFlyoutEnabled={isNewFlyoutEnabled}
            closeCanvas={onClose}
          >
            <SecurityReduxEmbeddedProvider resolveCanvasContext={resolveSecurityCanvasContext}>
              <QueryClientProvider client={entityAttachmentQueryClient}>
                <EntityCardFlyoutOverviewCanvas
                  identifier={{
                    identifierType,
                    identifier: title,
                    entityStoreId: entity.id,
                  }}
                />
              </QueryClientProvider>
            </SecurityReduxEmbeddedProvider>
          </EntityAnalyticsAgentNavigationProvider>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    )
  );
};
