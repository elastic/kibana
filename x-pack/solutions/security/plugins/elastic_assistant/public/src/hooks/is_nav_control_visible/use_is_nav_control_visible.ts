/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { combineLatest } from 'rxjs';
import { DEFAULT_APP_CATEGORIES, type PublicAppInfo } from '@kbn/core/public';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import { Space } from '@kbn/spaces-plugin/common';

function getVisibility(
  {
    appId,
    applications,
    preferredAssistantType,
    space,
    securitySolutionType
  }: {
    appId: string | undefined,
    applications: ReadonlyMap<string, PublicAppInfo>,
    preferredAssistantType: AIAssistantType,
    space: Space
    securitySolutionType: AIAssistantType.Security | AIAssistantType.Never
  }
) {
  switch (space.solution) {
    case undefined:
    case 'classic':
    case 'security':
      const visibilitySetting = (space.solution === 'classic' || space.solution == undefined) ? preferredAssistantType : securitySolutionType;
      if (visibilitySetting === AIAssistantType.Never) {
        return false;
      }

      const categoryId = (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;
      if (visibilitySetting === AIAssistantType.Security) {
        return !([
          DEFAULT_APP_CATEGORIES.observability.id,
          DEFAULT_APP_CATEGORIES.enterpriseSearch.id,
        ].includes(categoryId))
      }

      return DEFAULT_APP_CATEGORIES.security.id == categoryId;

    case 'oblt':
    case 'es':
    case 'chat':
      return false
    default:
      const _exhaustive: never = space.solution;
      throw new Error(`Unhandled shape: ${_exhaustive}`);

  }
}

export function useIsNavControlVisible() {
  const {
    application: { currentAppId$, applications$ },
    aiAssistantManagementSelection,
    spaces
  } = useKibana().services;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const appSubscription = combineLatest([
      currentAppId$,
      applications$,
      aiAssistantManagementSelection.aiAssistantType$,
      aiAssistantManagementSelection.securitySolutionType$,
      spaces.getActiveSpace$()
    ]).subscribe({
      next: ([appId, applications, preferredAssistantType, securitySolutionType, space]) => {
        setIsVisible(getVisibility({ appId, applications, preferredAssistantType, space, securitySolutionType }));
      },
    });

    return () => appSubscription.unsubscribe();
  }, [currentAppId$, applications$, aiAssistantManagementSelection.aiAssistantType$]);

  return {
    isVisible,
  };
}
