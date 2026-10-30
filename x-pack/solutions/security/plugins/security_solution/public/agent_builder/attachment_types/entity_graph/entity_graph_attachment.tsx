/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { APP_UI_ID, ENABLE_NEW_FLYOUT_SETTING } from '../../../../common/constants';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  buildEntityLeftPanel,
  buildEntityRightPanel,
  navigateToEntityAnalyticsWithFlyoutInApp,
  type SecurityAgentBuilderChrome,
  type EntityAnalyticsFlyoutNavigationState,
} from '../entity_explore_navigation';
import type { EntityGraphAttachment, EntityGraphAttachmentData } from './types';

export interface EntityGraphServices {
  application: ApplicationStart;
  http: HttpStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  searchSession?: ISessionService;
  experimentalFeatures: ExperimentalFeatures;
  uiSettings: IUiSettingsClient;
}

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entityGraph.label',
  { defaultMessage: 'Entity graph' }
);

const OPEN_FULL_GRAPH_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entityGraph.openFullGraph',
  { defaultMessage: 'Open full graph' }
);

const AGENT_BUILDER_ENTITY_GRAPH_SCOPE = 'agent-builder-entity-graph' as const;

const LazyEntityGraphInlineContent = React.lazy(() =>
  import('./entity_graph_inline_content').then((module) => ({
    default: module.EntityGraphInlineContent,
  }))
);

const buildEntityGraphFlyout = (
  data: EntityGraphAttachmentData
): EntityAnalyticsFlyoutNavigationState | null => {
  const identifier = {
    identifierType: data.identifierType,
    identifier: data.identifier,
    entityStoreId: data.entityStoreId,
  };
  const right = buildEntityRightPanel(identifier);
  if (!right) {
    return null;
  }

  const left = buildEntityLeftPanel({
    identifier,
    scopeId: AGENT_BUILDER_ENTITY_GRAPH_SCOPE,
    path: { tab: EntityDetailsLeftPanelTab.GRAPH_VIEW },
    isRiskScoreExist: false,
  });
  if (!left) {
    return null;
  }

  return { preview: [], right, left };
};

export const createEntityGraphAttachmentDefinition = ({
  application,
  http,
  agentBuilder,
  chrome,
  searchSession,
  experimentalFeatures,
  uiSettings,
}: EntityGraphServices): AttachmentUIDefinition<EntityGraphAttachment> => {
  return {
    getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
    getIcon: () => 'graphApp',
    renderInlineContent: (props: AttachmentRenderProps<EntityGraphAttachment>) => (
      <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
        <LazyEntityGraphInlineContent {...props} http={http} />
      </React.Suspense>
    ),
    getActionButtons: ({ attachment, openSidebarConversation }) => {
      const flyout = buildEntityGraphFlyout(attachment.data);
      if (!flyout) {
        return [];
      }

      const isNewFlyoutEnabled =
        !experimentalFeatures.newFlyoutSystemDisabled &&
        uiSettings.get<boolean>(ENABLE_NEW_FLYOUT_SETTING, true);

      return [
        {
          label: OPEN_FULL_GRAPH_LABEL,
          icon: 'external',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            navigateToEntityAnalyticsWithFlyoutInApp({
              application,
              appId: APP_UI_ID,
              flyout,
              agentBuilder,
              chrome,
              openSidebarConversation,
              searchSession,
              isNewFlyoutEnabled,
            });
          },
        },
      ];
    },
  };
};
