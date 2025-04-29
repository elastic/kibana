/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana, useNavigateTo } from '../../../common/lib/kibana';

export const INTEGRATIONS_URL = '/app/security/configurations/integrations/browse';

/**
 * Hook that returns a callback event to navigate to the AI4DSOC integrations page
 */
export const useNavigateToIntegrationsPage = (): (() => void) => {
  const {
    services: {
      http: {
        basePath: { prepend },
      },
    },
  } = useKibana();
  const { navigateTo } = useNavigateTo();

  return useCallback(() => {
    navigateTo({ url: prepend(INTEGRATIONS_URL) });
  }, [navigateTo, prepend]);
};
