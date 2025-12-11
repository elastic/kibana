/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { ONECHAT_FEATURE_ID } from '@kbn/onechat-plugin/public';
import { useKibana } from '../../common/lib/kibana';

interface UseAgentBuilderAvailability {
  /** Whether the agent builder feature is fully enabled. Requires both privilege and Agent chat experience. */
  isAgentBuilderEnabled: boolean;
  /** Whether the user has the necessary permissions to access the agent builder feature. */
  hasAgentBuilderPrivilege: boolean;
  /** Whether the AI chat experience is set to Agent mode (as opposed to Classic Assistant mode). */
  isAgentChatExperienceEnabled: boolean;
}

export const useAgentBuilderAvailability = (): UseAgentBuilderAvailability => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );
  const { capabilities } = useKibana().services.application;

  return useMemo(() => {
    const agentBuilderCapabilities = capabilities[ONECHAT_FEATURE_ID];
    const hasAgentBuilderPrivilege = agentBuilderCapabilities?.show === true;
    const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

    return {
      isAgentBuilderEnabled: hasAgentBuilderPrivilege && isAgentChatExperienceEnabled,
      hasAgentBuilderPrivilege,
      isAgentChatExperienceEnabled,
    };
  }, [capabilities, chatExperience]);
};
