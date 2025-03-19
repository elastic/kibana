/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import { IntegrationType } from '@kbn/wci-common';
import { useWorkChatServices } from './use_workchat_service';

/**
 * Hook to get the configuration form component for a specific integration type
 * @param type - The integration type
 * @returns The configuration form component or undefined if not available
 */
export const useIntegrationToolView = (toolName: string) => {
  const [integrationId, name] = toolName.split('___');

  const { integrationRegistry, integrationService } = useWorkChatServices();

  const [integrationType, setIntegrationType] = useState<IntegrationType | null>(null);

  useEffect(() => {
    const fetchIntegration = async () => {
      try {
        const integration = await integrationService.get(integrationId);
        setIntegrationType(integration?.type as IntegrationType);
      } catch (error) {
        console.error('Error fetching tool view:', error);
      }
    };

    fetchIntegration();
  }, [integrationId, integrationService]);

  return useMemo(() => {
    if (!integrationType) {
      return null;
    }

    const integrationDefinition = integrationRegistry.get(integrationType as IntegrationType);
    const toolView = integrationDefinition?.getTool?.(name);

    return toolView;
  }, [integrationType, name]);
};
