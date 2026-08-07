/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { APP_UI_ID } from '../../../../common/constants';
import type { EntityFlyoutRightPanel } from '../entity_explore_navigation';
import { navigateToEntityAnalyticsWithFlyoutInApp } from '../entity_explore_navigation';
import { EntityGraphContainer } from './entity_graph_container';
import { entityGraphQueryClient } from './query_client';
import type { EntityGraphAttachment, EntityGraphAttachmentData } from './types';
import type { EntityGraphServices } from './entity_graph_attachment';
import { HostDetailsPanelKey } from '../../../flyout/entity_details/host_details_left';
import type { HostDetailsPanelProps } from '../../../flyout/entity_details/host_details_left';
import type { UserDetailsPanelProps } from '../../../flyout/entity_details/user_details_left';
import { UserDetailsPanelKey } from '../../../flyout/entity_details/user_details_left';
import { ServiceDetailsPanelKey } from '../../../flyout/entity_details/service_details_left';
import type { ServiceDetailsPanelProps } from '../../../flyout/entity_details/service_details_left';
import {
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from '../../../flyout/entity_details/shared/constants';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';

export const EntityGraphInlineContent: React.FC<
  AttachmentRenderProps<EntityGraphAttachment> &
    Omit<EntityGraphServices, 'experimentalFeatures' | 'uiSettings'> & {
      isNewFlyoutEnabled: boolean;
    }
> = ({
  attachment,
  openSidebarConversation,
  application,
  http,
  agentBuilder,
  chrome,
  searchSession,
  isNewFlyoutEnabled,
}) => {
  const flyout = buildEntityGraphFlyout(attachment.data);

  const onOpenFullGraph = useCallback(() => {
    if (flyout) {
      navigateToEntityAnalyticsWithFlyoutInApp({
        application,
        appId: APP_UI_ID,
        agentBuilder,
        chrome,
        openSidebarConversation,
        searchSession,
        flyout,
        isNewFlyoutEnabled,
      });
    }
  }, [
    flyout,
    application,
    agentBuilder,
    chrome,
    openSidebarConversation,
    searchSession,
    isNewFlyoutEnabled,
  ]);

  return (
    <KibanaContextProvider services={{ http }}>
      <QueryClientProvider client={entityGraphQueryClient}>
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EntityGraphContainer
            data={attachment.data}
            onOpenFullGraph={flyout ? onOpenFullGraph : undefined}
          />
        </EuiPanel>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};

const AGENT_BUILDER_ENTITY_GRAPH_SCOPE = 'agent-builder-entity-graph' as const;

const buildEntityGraphFlyout = (data: EntityGraphAttachmentData) => {
  const { identifierType, identifier: displayName, entityStoreId } = data;

  const contextID = AGENT_BUILDER_ENTITY_GRAPH_SCOPE;
  const scopeId = AGENT_BUILDER_ENTITY_GRAPH_SCOPE;
  const path = { tab: EntityDetailsLeftPanelTab.GRAPH_VIEW };

  switch (identifierType) {
    case 'host':
      return {
        preview: [],
        left: {
          id: HostDetailsPanelKey,
          params: {
            isRiskScoreExist: false,
            hostName: displayName,
            entityId: entityStoreId,
            scopeId,
            entityStoreEntityId: entityStoreId,
            path,
          } satisfies HostDetailsPanelProps,
        },
        right: {
          id: HostPanelKey,
          params: { contextID, scopeId, hostName: displayName, entityId: entityStoreId },
        } satisfies EntityFlyoutRightPanel,
      };
    case 'user':
      return {
        preview: [],
        left: {
          id: UserDetailsPanelKey,
          params: {
            isRiskScoreExist: false,
            userName: displayName,
            identityFields: { 'user.name': displayName },
            entityId: entityStoreId,
            scopeId,
            entityStoreEntityId: entityStoreId,
            path,
          } satisfies UserDetailsPanelProps,
        },
        right: {
          id: UserPanelKey,
          params: {
            contextID,
            scopeId,
            userName: displayName,
            identityFields: { 'user.name': displayName },
            entityId: entityStoreId,
          },
        } satisfies EntityFlyoutRightPanel,
      };
    case 'service':
      return {
        preview: [],
        left: {
          id: ServiceDetailsPanelKey,
          params: {
            isRiskScoreExist: false,
            identityFields: { 'service.name': displayName },
            scopeId,
            entityStoreEntityId: entityStoreId,
            path,
          } satisfies ServiceDetailsPanelProps,
        },
        right: {
          id: ServicePanelKey,
          params: { contextID, scopeId, serviceName: displayName, entityId: entityStoreId },
        } satisfies EntityFlyoutRightPanel,
      };
    default:
      return null;
  }
};
