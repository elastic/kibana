/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { parseToolName } from '@kbn/wci-common';
import { IntegrationToolComponentProps } from '@kbn/wci-browser';
import { useWorkChatServices } from './use_workchat_service';
import { useIntegrationList } from './use_integration_list';
import { ChatDefaultToolCallRendered } from '../components/chat/chat_default_tool_call';

type WiredToolComponentProps = Omit<IntegrationToolComponentProps, 'integration'>;

/**
 * Hook to get the component that should be used to render a tool call in the conversation history
 */
export const useIntegrationToolView = (
  fullToolName: string
): React.ComponentType<WiredToolComponentProps> => {
  const { integrationRegistry } = useWorkChatServices();
  const { integrationId, toolName } = useMemo(() => parseToolName(fullToolName), [fullToolName]);
  const { integrations } = useIntegrationList();

  const integration = useMemo(() => {
    return integrations.find((integ) => integ.id === integrationId);
  }, [integrationId, integrations]);

  const ToolRenderedComponent = useMemo(() => {
    if (integration) {
      const definition = integrationRegistry.get(integration.type);
      if (definition) {
        return definition.getToolCallComponent(toolName);
      }
    }
  }, [integrationRegistry, integration, toolName]);

  return useMemo(() => {
    if (integration && ToolRenderedComponent) {
      return (props: WiredToolComponentProps) => (
        <ToolRenderedComponent integration={integration} {...props} />
      );
    }
    return ChatDefaultToolCallRendered;
  }, [ToolRenderedComponent, integration]);
};
