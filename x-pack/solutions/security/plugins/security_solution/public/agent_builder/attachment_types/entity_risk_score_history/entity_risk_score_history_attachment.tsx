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
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { APP_UI_ID, ENABLE_NEW_FLYOUT_SETTING } from '../../../../common/constants';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  buildEntityLeftPanel,
  buildEntityRightPanel,
  navigateToEntityAnalyticsWithFlyoutInApp,
  type SecurityAgentBuilderChrome,
  type EntityAnalyticsFlyoutNavigationState,
} from '../entity_explore_navigation';
import type { EntityRiskScoreHistoryAttachment } from './types';

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entityRiskScoreHistory.label',
  { defaultMessage: 'Risk score history' }
);

const OPEN_RISK_HISTORY_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.entityRiskScoreHistory.openRiskHistory',
  { defaultMessage: 'Open full risk history' }
);

const AGENT_BUILDER_RISK_HISTORY_SCOPE = 'agent-builder-risk-history' as const;

const LazyEntityRiskScoreHistoryInlineContent = React.lazy(() =>
  import('./entity_risk_score_history_inline_content').then((module) => ({
    default: module.EntityRiskScoreHistoryInlineContent,
  }))
);

const buildRiskHistoryFlyout = (
  data: EntityRiskScoreHistoryAttachment['data']
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
    scopeId: AGENT_BUILDER_RISK_HISTORY_SCOPE,
    path: {
      tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
      ...(data.scoreType === 'resolution'
        ? { subTab: RiskScoreLeftPanelSubTab.RESOLUTION }
        : { subTab: RiskScoreLeftPanelSubTab.ENTITY }),
    },
    isRiskScoreExist: true,
  });
  if (!left) {
    return null;
  }

  return { preview: [], right, left };
};

export const createEntityRiskScoreHistoryAttachmentDefinition = ({
  application,
  agentBuilder,
  chrome,
  experimentalFeatures,
  searchSession,
  uiSettings,
}: {
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  experimentalFeatures: ExperimentalFeatures;
  searchSession?: ISessionService;
  uiSettings: IUiSettingsClient;
}): AttachmentUIDefinition<EntityRiskScoreHistoryAttachment> => {
  return {
    getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
    getIcon: () => 'visLine',
    renderInlineContent: (props: AttachmentRenderProps<EntityRiskScoreHistoryAttachment>) => (
      <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
        <LazyEntityRiskScoreHistoryInlineContent {...props} />
      </React.Suspense>
    ),
    getActionButtons: ({ attachment, openSidebarConversation }) => {
      const flyout = buildRiskHistoryFlyout(attachment.data);
      if (!flyout) {
        return [];
      }

      const isNewFlyoutEnabled =
        !experimentalFeatures.newFlyoutSystemDisabled &&
        uiSettings.get<boolean>(ENABLE_NEW_FLYOUT_SETTING, true);

      return [
        {
          label: OPEN_RISK_HISTORY_LABEL,
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
