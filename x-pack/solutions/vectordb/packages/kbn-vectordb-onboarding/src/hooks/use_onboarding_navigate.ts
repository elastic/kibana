/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../services';

/**
 * Navigate within the hosting app using core's `navigateToUrl`. The target
 * `path` is resolved against the app's mount point via `getUrlForApp`, so core
 * performs an in-app SPA transition rather than a full page reload.
 */
export const useOnboardingNavigate = () => {
  const {
    services: { application },
  } = useKibana();

  const appId = useObservable(application.currentAppId$);

  return useCallback(
    (path: string) => {
      if (!appId) return;
      application.navigateToUrl(application.getUrlForApp(appId, { path }));
    },
    [application, appId]
  );
};
