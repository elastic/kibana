/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { THREAT_HUNTING_AGENT_ID } from '../../../common/constants';

/**
 * Returns the Security agent ID to use for agent builder interactions.
 * When skills are enabled (experimental features), returns undefined so
 * the default agent is used. Otherwise returns the threat hunting agent ID.
 */
export const useSecurityAgentId = (): string | undefined => {
  const skillsEnabled = useUiSetting<boolean>(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );
  return skillsEnabled ? undefined : THREAT_HUNTING_AGENT_ID;
};
