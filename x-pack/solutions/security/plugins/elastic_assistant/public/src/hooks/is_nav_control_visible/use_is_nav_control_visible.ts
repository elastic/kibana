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

function getVisibility(
  appId: string | undefined,
  applications: ReadonlyMap<string, PublicAppInfo>,
  preferredAssistantType: AIAssistantType
) {
  // The "Global assistant" stack management setting for the security assistant still needs to be developed.
  // In the meantime, while testing, show the Security assistant everywhere except in Observability.

  const categoryId =
    (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;

  return DEFAULT_APP_CATEGORIES.security.id === categoryId;
}

export function useIsNavControlVisible() {
  const {
    application: { currentAppId$, applications$ },
    aiAssistantManagementSelection,
  } = useKibana().services;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const appSubscription = combineLatest([
      currentAppId$,
      applications$,
      aiAssistantManagementSelection.aiAssistantType$,
    ]).subscribe({
      next: ([appId, applications, preferredAssistantType]) => {
        setIsVisible(getVisibility(appId, applications, preferredAssistantType));
      },
    });

    return () => appSubscription.unsubscribe();
  }, [currentAppId$, applications$, aiAssistantManagementSelection.aiAssistantType$]);

  return {
    isVisible,
  };
}
