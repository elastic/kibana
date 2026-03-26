/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_UI_READ_PRIVILEGE,
  SECURITY_UI_SHOW_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { ConfigurationTabs } from './constants';
import * as i18n from './translations';
import type { LinkItem } from '..';
import { CONFIGURATIONS_PATH, SECURITY_FEATURE_ID, SecurityPageName } from '../../common/constants';
import { CONFIGURATIONS } from '../app/translations';

const baseConfigurationsLinks: LinkItem = {
  capabilities: [[SECURITY_UI_SHOW_PRIVILEGE, `${SECURITY_FEATURE_ID}.configurations`]],
  globalNavPosition: 3,
  globalSearchKeywords: [i18n.CONFIGURATIONS],
  hideTimeline: true,
  id: SecurityPageName.configurations,
  path: CONFIGURATIONS_PATH,
  title: CONFIGURATIONS,
  links: [
    {
      id: SecurityPageName.configurationsIntegrations,
      title: i18n.INTEGRATIONS,
      path: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.configurationsBasicRules,
      title: i18n.BASIC_RULES,

      path: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.basicRules}`,
      skipUrlState: true,
      hideTimeline: true,
      capabilities: [RULES_UI_READ_PRIVILEGE],
    },
    {
      id: SecurityPageName.configurationsAiSettings,
      title: i18n.AI_SETTINGS,
      path: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.aiSettings}`,
      skipUrlState: true,
      hideTimeline: true,
    },
  ],
};

export const getConfigurationsLinks = (
  chatExperience: AIChatExperience = AIChatExperience.Classic
): LinkItem => {
  if (chatExperience === AIChatExperience.Agent) {
    return {
      ...baseConfigurationsLinks,
      links: baseConfigurationsLinks.links?.filter(
        (link) => link.id !== SecurityPageName.configurationsAiSettings
      ),
    };
  }
  return baseConfigurationsLinks;
};

export const configurationsLinks: LinkItem = baseConfigurationsLinks;
