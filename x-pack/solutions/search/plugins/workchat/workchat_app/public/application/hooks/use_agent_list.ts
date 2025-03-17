/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import type { Agent } from '../../../common/agents';
import { useWorkChatServices } from './use_workchat_service';

export const useAgentList = () => {
  const { agentService } = useWorkChatServices();
  const [isLoading, setLoading] = useState<boolean>(false);
  const [agents, setAgents] = useState<Agent[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    const nextAgents = await agentService.list();

    setAgents(nextAgents);
    setLoading(false);
  }, [agentService]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    agents,
    isLoading,
    refresh,
  };
};
