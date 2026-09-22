/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { ENABLE_NEW_FLYOUT_SETTING } from '../../../../common/constants';
import type { SecurityAgentBuilderChrome } from '../entity_explore_navigation';
import type { EntityGraphAttachment } from './types';

export interface EntityGraphServices {
  application: ApplicationStart;
  http: HttpStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  searchSession?: ISessionService;
  experimentalFeatures: ExperimentalFeatures;
  uiSettings: IUiSettingsClient;
}

const LazyEntityGraphInlineContent = React.lazy(() =>
  import('./entity_graph_inline_content').then((module) => ({
    default: module.EntityGraphInlineContent,
  }))
);

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
    getLabel: (attachment) =>
      attachment.data.attachmentLabel ??
      i18n.translate('xpack.securitySolution.agentBuilder.attachments.entityGraph.label', {
        defaultMessage: 'Entity graph',
      }),
    getIcon: () => 'graphApp',
    renderInlineContent: (props) => {
      const isNewFlyoutEnabled =
        !experimentalFeatures.newFlyoutSystemDisabled &&
        uiSettings.get<boolean>(ENABLE_NEW_FLYOUT_SETTING, true);

      return (
        <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
          <LazyEntityGraphInlineContent
            {...props}
            application={application}
            http={http}
            agentBuilder={agentBuilder}
            chrome={chrome}
            searchSession={searchSession}
            isNewFlyoutEnabled={isNewFlyoutEnabled}
          />
        </React.Suspense>
      );
    },
  };
};
