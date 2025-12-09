/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-management-plugin/public';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';

/**
 * Hook that returns true when the chat experience is set to Agent.
 * This replaces the previous agentBuilderEnabled experimental feature flag.
 */
export const useAgentBuilderAvailability = (): boolean => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );
  return chatExperience === AIChatExperience.Agent;
};
