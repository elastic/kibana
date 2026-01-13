/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIAssistantType, AIChatExperience } from '@kbn/ai-assistant-management-plugin/public';
import { DEFAULT_APP_CATEGORIES, type PublicAppInfo } from '@kbn/core/public';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { Space } from '@kbn/spaces-plugin/common';
import { combineLatest, map } from 'rxjs';
import type { StartServices } from '../../types';

const ASSISTANT_FEATURE_ID = 'securitySolutionAssistant';

function getVisibility(
  appId: string | undefined,
  applications: ReadonlyMap<string, PublicAppInfo>,
  preferredAssistantType: AIAssistantType,
  chatExperience: AIChatExperience,
  space: Space,
  hasAssistantPrivilege: boolean,
  isServerless?: boolean
) {
  // Check capability first - user must have assistant privilege
  if (!hasAssistantPrivilege) {
    return false;
  }
  // If AI Agents are enabled, hide the nav control
  // AgentBuilderNavControl will be used instead
  if (chatExperience === AIChatExperience.Agent) {
    return false;
  }

  // If the app itself is enabled, always show the control in the solution view or serverless.
  if (space.solution === 'security' || isServerless) {
    return true;
  }
  if (preferredAssistantType === AIAssistantType.Never) {
    return false;
  }

  const categoryId =
    (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;

  if (preferredAssistantType === AIAssistantType.Security) {
    return (
      DEFAULT_APP_CATEGORIES.observability.id !== categoryId &&
      DEFAULT_APP_CATEGORIES.enterpriseSearch.id !== categoryId
    );
  }

  return DEFAULT_APP_CATEGORIES.security.id === categoryId;
}

/**
 * Returns an Observable that emits whether the Elastic Assistant nav control should be visible.
 * Visibility depends on current app, space, chat experience, preferred assistant type, and user capabilities.
 */
export function getIsNavControlVisible$(services: StartServices, isServerless?: boolean) {
  const { application, settings, aiAssistantManagementSelection, spaces } = services;
  const { currentAppId$, applications$, capabilities } = application;

  const hasAssistantPrivilege = capabilities[ASSISTANT_FEATURE_ID]?.['ai-assistant'] === true;

  const space$ = spaces.getActiveSpace$();
  const chatExperience$ = settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);

  return combineLatest([
    currentAppId$,
    applications$,
    aiAssistantManagementSelection.aiAssistantType$,
    chatExperience$,
    space$,
  ]).pipe(
    map(([appId, applications, preferredAssistantType, chatExperience, space]) => {
      return getVisibility(
        appId,
        applications,
        preferredAssistantType,
        chatExperience,
        space,
        hasAssistantPrivilege,
        isServerless
      );
    })
  );
}
