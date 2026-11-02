/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useLicense } from '../../../common/hooks/use_license';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { useLeadGenerationPrivileges } from '../../api/hooks/use_lead_generation_privileges';

/** Whether Hunt with AI can work: Agent chat is on and the user can read leads through `security.list_leads`. */
export const useHuntWithAiAvailability = (): boolean => {
  const { agentBuilder } = useKibana().services;
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const isEnterprise = useLicense().isEnterprise();
  const isLeadGenerationEnabled = useIsExperimentalFeatureEnabled('leadGenerationEnabled');

  // Mirrors the `security.list_leads` availability and privilege checks on the server.
  const isEnabled =
    isAgentChatExperienceEnabled && agentBuilder != null && isLeadGenerationEnabled && isEnterprise;
  const { data: leadPrivileges } = useLeadGenerationPrivileges(isEnabled);

  return isEnabled && leadPrivileges?.has_read_permissions === true;
};
