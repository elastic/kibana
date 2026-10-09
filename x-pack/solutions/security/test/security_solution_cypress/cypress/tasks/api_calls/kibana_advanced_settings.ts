/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_CHAT_EXPERIENCE_TYPE,
  SECURITY_SOLUTION_ENABLE_SIEM_READINESS_SETTING,
  SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID,
} from '@kbn/management-settings-ids';
import { ENABLE_NEW_FLYOUT_SETTING } from '@kbn/security-solution-plugin/common/constants';
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

export const enableSiemReadiness = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_SIEM_READINESS_SETTING, true);
};

export const disableSiemReadiness = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_SIEM_READINESS_SETTING, false);
};

export const setPreferredChatExperienceToAgent = () => {
  setKibanaSetting(AI_CHAT_EXPERIENCE_TYPE, 'agent');
};

export const setPreferredChatExperienceToClassic = () => {
  // Specs often set classic mode via `ftrConfig.kbnServerArgs` (`--uiSettings.overrides...`).
  // Re-applying the same value via this API then returns 400; tolerate so local runs still work.
  rootRequest({
    method: 'POST',
    url: 'internal/kibana/settings',
    body: { changes: { [AI_CHAT_EXPERIENCE_TYPE]: 'classic' } },
    failOnStatusCode: false,
  });
};

export const disableNewFlyout = () => {
  setKibanaSetting(ENABLE_NEW_FLYOUT_SETTING, false);
};
