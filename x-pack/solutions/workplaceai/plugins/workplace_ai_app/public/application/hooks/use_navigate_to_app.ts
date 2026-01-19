/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { NavigateToAppOptions } from '@kbn/core-application-browser';
import { useKibana } from './use_kibana';

export const useNavigateToApp = () => {
  const {
    services: { application, chrome },
  } = useKibana();

  const navigateToApp = useCallback(
    (appId: string, options?: NavigateToAppOptions) => {
      if (options?.path) {
        application?.navigateToApp(appId, options);
        return;
      }

      const appUrl = chrome?.navLinks.get(appId)?.url;

      if (appUrl) {
        application?.navigateToUrl(appUrl);
      }
    },
    [application, chrome]
  );

  return navigateToApp;
};
