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
import { useKibana } from '../../common/lib/kibana';

const AGENT_BUILDER_FEATURE_ID = 'agentBuilder';

export const useIsAgentBuilderEnabled = (): {
  isAgentBuilderEnabled: boolean;
  hasAgentBuilderPrivilege: boolean;
  isAgentChatExperienceEnabled: boolean;
} => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );
  const { capabilities } = useKibana().services.application;

  return useMemo(() => {
    const agentBuilderCapabilities = capabilities[AGENT_BUILDER_FEATURE_ID];
    const hasAgentBuilderPrivilege = agentBuilderCapabilities?.show === true;
    const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

    return {
      isAgentBuilderEnabled: hasAgentBuilderPrivilege && isAgentChatExperienceEnabled,
      hasAgentBuilderPrivilege,
      isAgentChatExperienceEnabled,
    };
  }, [capabilities, chatExperience]);
};
