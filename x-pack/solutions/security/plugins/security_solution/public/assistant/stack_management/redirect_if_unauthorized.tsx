/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';

export function RedirectIfUnauthorized({
  coreStart,
  children,
}: {
  coreStart: CoreStart;
  children: ReactNode;
}) {
  const {
    application: { capabilities, navigateToApp },
  } = coreStart;

  const chatExperience = coreStart.settings.client.get<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );

  const securityAIAssistantEnabled =
    capabilities?.securitySolutionAssistant?.['ai-assistant'] ?? false;

  const allowed = securityAIAssistantEnabled && chatExperience !== AIChatExperience.Agent;

  if (!allowed) {
    navigateToApp('home');
    return null;
  }

  return <>{children}</>;
}
