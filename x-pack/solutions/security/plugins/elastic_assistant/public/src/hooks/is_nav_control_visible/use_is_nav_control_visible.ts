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
import { ChromeStyle } from '@kbn/core/packages/chrome/browser';

function getVisibility(
  {
    appId,
    applications,
    preferredAssistantType,
    chromeStyle
  }:
    {
      appId: string | undefined,
      applications: ReadonlyMap<string, PublicAppInfo>,
      preferredAssistantType: AIAssistantType
      chromeStyle: ChromeStyle
    }
) {
  if (chromeStyle === "project") {
    return true;
  }

  // The "Global assistant" stack management setting for the security assistant still needs to be developed.
  // In the meantime, the security assistant is only available in Security apps.

  const categoryId =
    (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;

  return DEFAULT_APP_CATEGORIES.security.id === categoryId;
}

export function useIsNavControlVisible() {
  const {
    application: { currentAppId$, applications$ },
    aiAssistantManagementSelection,
    chrome
  } = useKibana().services;
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const appSubscription = combineLatest([
      currentAppId$,
      applications$,
      aiAssistantManagementSelection.aiAssistantType$,
      chrome.getChromeStyle$()
    ]).subscribe({
      next: ([appId, applications, preferredAssistantType, chromeStyle]) => {
        setIsVisible(getVisibility({ appId, applications, preferredAssistantType, chromeStyle }));
      },
    });

    return () => appSubscription.unsubscribe();
  }, [currentAppId$, applications$, aiAssistantManagementSelection.aiAssistantType$]);

  return {
    isVisible,
  };
}
