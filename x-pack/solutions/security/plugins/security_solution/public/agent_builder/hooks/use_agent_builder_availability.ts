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
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '../../common/lib/kibana';
import { useLicense } from '../../common/hooks/use_license';

interface UseAgentBuilderAvailability {
  /** Whether the agent builder feature is enabled. Requires both privilege and Agent chat experience. */
  isAgentBuilderEnabled: boolean;
  /** Whether the user has the necessary permissions to access the agent builder feature. */
  hasAgentBuilderPrivilege: boolean;
  /** Whether the AI chat experience is set to Agent mode (as opposed to Classic Assistant mode). */
  isAgentChatExperienceEnabled: boolean;
  /** Whether the user has a license that supports agent builder functionality. */
  hasValidAgentBuilderLicense: boolean;
}

export const useAgentBuilderAvailability = (): UseAgentBuilderAvailability => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );
  const {
    services: {
      application: { capabilities },
      pricing,
    },
  } = useKibana();
  const licenseService = useLicense();

  return useMemo(() => {
    const agentBuilderCapabilities = capabilities[AGENTBUILDER_FEATURE_ID];
    const hasAgentBuilderPrivilege = agentBuilderCapabilities?.show === true;
    const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;
    const activeProduct = pricing?.getActiveProduct?.();

    /**
     * Serverless uses pricing tiers (`complete`/`essentials`/`search_ai_lake`) to represent entitlements.
     * In that case, prefer pricing tier checks over Elasticsearch license types.
     */
    const hasValidAgentBuilderLicense =
      activeProduct?.type === 'security'
        ? activeProduct.tier === 'complete' || activeProduct.tier === 'search_ai_lake'
        : licenseService.isEnterprise();

    return {
      isAgentBuilderEnabled: hasAgentBuilderPrivilege && isAgentChatExperienceEnabled,
      hasAgentBuilderPrivilege,
      isAgentChatExperienceEnabled,
      hasValidAgentBuilderLicense,
    };
  }, [capabilities, chatExperience, licenseService, pricing]);
};
