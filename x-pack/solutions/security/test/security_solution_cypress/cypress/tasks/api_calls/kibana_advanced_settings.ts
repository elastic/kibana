/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID,
  AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';
import { EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING } from '@kbn/security-solution-plugin/common/constants';
import { rootRequest } from './common';

export const setKibanaSetting = (key: string, value: boolean | number | string) => {
  rootRequest({
    method: 'POST',
    url: 'internal/kibana/settings',
    body: { changes: { [key]: value } },
  });
};

export const enableRelatedIntegrations = () => {
  setKibanaSetting(SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID, true);
};

export const disableRelatedIntegrations = () => {
  setKibanaSetting(SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID, false);
};

export const setPreferredChatExperienceToAgent = () => {
  setKibanaSetting(AI_CHAT_EXPERIENCE_TYPE, 'agent');
};

export const enableExtendedRuleExecutionLogging = () => {
  setKibanaSetting(EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING, true);
};

export const disableExtendedRuleExecutionLogging = () => {
  setKibanaSetting(EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING, false);
};
