/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import type { Integration } from '@kbn/wci-common';
import { useWorkChatServices } from './use_workchat_service';

export const useIntegrationList = () => {
  const { integrationService } = useWorkChatServices();
  const [isLoading, setLoading] = useState<boolean>(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    const nextIntegrations = await integrationService.list();

    setIntegrations(nextIntegrations);
    setLoading(false);
  }, [integrationService]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    integrations,
    isLoading,
    refresh,
  };
};
