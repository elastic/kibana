/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useKibana } from '../hooks/use_kibana';

/** Whether Getting Started has been opened in this browser. */
export const hasVisitedGettingStarted = (): boolean => {
  try {
    return localStorage.getItem(GETTING_STARTED_LOCALSTORAGE_KEY) === 'true';
  } catch {
    // Without storage the redirect would fire on every visit, so treat Getting Started as visited.
    return true;
  }
};

/** Getting Started is a separate app, so a router `Redirect` cannot reach it. */
export const GettingStartedRedirect = () => {
  const { application } = useKibana().services;

  useEffect(() => {
    application.navigateToApp('searchGettingStarted');
  }, [application]);

  return null;
};
