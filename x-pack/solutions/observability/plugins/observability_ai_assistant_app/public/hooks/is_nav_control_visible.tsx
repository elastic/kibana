/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { combineLatest } from 'rxjs';
import { CoreStart, DEFAULT_APP_CATEGORIES, type PublicAppInfo } from '@kbn/core/public';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';
import { Space } from '@kbn/spaces-plugin/public';

interface UseIsNavControlVisibleProps {
  coreStart: CoreStart;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}

function getVisibility(
  {
    appId,
    applications,
    preferredAssistantType,
    space,
    observabilitySolutionType,
    searchSolutionType
  }: {
    appId: string | undefined,
    applications: ReadonlyMap<string, PublicAppInfo>,
    space: Space,
    preferredAssistantType: AIAssistantType,
    observabilitySolutionType: AIAssistantType.Observability | AIAssistantType.Never,
    searchSolutionType: AIAssistantType.Observability | AIAssistantType
  }
) {

  switch (space.solution) {
    case undefined:
    case 'classic':
    case 'oblt':
    case 'es':
      const visibilitySetting = space.solution === 'classic' || space.solution == undefined ? preferredAssistantType : space.solution === 'oblt' ? observabilitySolutionType : searchSolutionType;
      if (visibilitySetting === AIAssistantType.Never) {
        return false;
      }

      const categoryId = (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;
      if (visibilitySetting === AIAssistantType.Observability) {
        return categoryId !== DEFAULT_APP_CATEGORIES.security.id;
      }

      return [
        DEFAULT_APP_CATEGORIES.observability.id,
        DEFAULT_APP_CATEGORIES.enterpriseSearch.id,
      ].includes(categoryId);

    case 'security':
    case 'chat':
      return false
    default:
      const _exhaustive: never = space.solution;
      throw new Error(`Unhandled shape: ${_exhaustive}`);

  }
}

export function useIsNavControlVisible({ coreStart, pluginsStart }: UseIsNavControlVisibleProps) {
  const [isVisible, setIsVisible] = useState(false);

  const { currentAppId$, applications$ } = coreStart.application;
  const { aiAssistantManagementSelection, spaces } = pluginsStart;

  useEffect(() => {
    const appSubscription = combineLatest([
      currentAppId$,
      applications$,
      spaces.getActiveSpace$(),
      aiAssistantManagementSelection.aiAssistantType$,
      aiAssistantManagementSelection.observabilitySolutionType$,
      aiAssistantManagementSelection.searchSolutionType$,
    ]).subscribe({
      next: ([appId, applications, space, preferredAssistantType, observabilitySolutionType, searchSolutionType]) => {
        setIsVisible(getVisibility({ appId, applications, space, preferredAssistantType, observabilitySolutionType, searchSolutionType }));
      },
    });

    return () => appSubscription.unsubscribe();
  }, [currentAppId$, applications$, aiAssistantManagementSelection.aiAssistantType$]);

  return {
    isVisible,
  };
}
