/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { APP_UI_ID, ENABLE_NEW_FLYOUT_SETTING } from '../../../common/constants';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EntityAnalyticsAiBriefResult } from '../../../common/entity_analytics/ai_brief/result';
import {
  buildEntityLeftPanel,
  buildEntityRightPanel,
  navigateToEntityAnalyticsWithFlyoutInApp,
} from './entity_explore_navigation';
import type { SecurityAgentBuilderChrome } from './entity_explore_navigation';

const label = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.aiBriefResult.label',
  { defaultMessage: 'Entity Analytics AI brief' }
);
const expandLabel = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.aiBriefResult.expand',
  { defaultMessage: 'Expand brief' }
);
const LazyContent = React.lazy(() =>
  import('./entity_analytics_ai_brief_result_content').then(
    ({ EntityAnalyticsAiBriefResultContent }) => ({ default: EntityAnalyticsAiBriefResultContent })
  )
);

export const createEntityAnalyticsAiBriefResultAttachmentDefinition = ({
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
}): AttachmentUIDefinition<EntityAnalyticsAiBriefResult> => {
  const render = (props: AttachmentRenderProps<EntityAnalyticsAiBriefResult>) => (
    <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
      <LazyContent
        {...props}
        onOpenEntity={(priority) => {
          if (priority.type === 'generic') return;

          const identifier = {
            identifierType: priority.type,
            identifier: priority.name,
            entityStoreId: priority.entityId,
          };
          const right = buildEntityRightPanel(identifier);
          const left = buildEntityLeftPanel({
            identifier,
            scopeId: 'agent-builder-ai-brief',
            path: {},
            isRiskScoreExist: Boolean(priority.risk),
          });
          if (!right || !left) return;

          const isNewFlyoutEnabled =
            !experimentalFeatures.newFlyoutSystemDisabled &&
            uiSettings.get<boolean>(ENABLE_NEW_FLYOUT_SETTING, true);

          navigateToEntityAnalyticsWithFlyoutInApp({
            application,
            appId: APP_UI_ID,
            flyout: { preview: [], right, left },
            agentBuilder,
            chrome,
            openSidebarConversation: props.openSidebarConversation,
            searchSession,
            isNewFlyoutEnabled,
          });
        }}
      />
    </React.Suspense>
  );

  return {
    getLabel: () => label,
    getIcon: () => 'document',
    renderInlineContent: render,
    renderCanvasContent: render,
    canvasWidth: '50vw',
    getActionButtons: ({ openCanvas, isCanvas }) =>
      openCanvas && !isCanvas
        ? [
            {
              label: expandLabel,
              icon: 'expand',
              type: ActionButtonType.SECONDARY,
              handler: openCanvas,
            },
          ]
        : [],
  };
};
