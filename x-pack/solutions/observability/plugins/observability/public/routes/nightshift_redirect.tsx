/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { useEffect } from 'react';
import { useKibana } from '../utils/kibana_react';

/**
 * Temporary shim keeping /app/observability/nightshift resolvable while the nav
 * still points at the observability deep link. Deleted in the PR that repoints
 * the nav trees at the standalone app.
 */
export function NightshiftRedirect(): null {
  const { application } = useKibana().services;

  useEffect(() => {
    application.navigateToApp(NIGHTSHIFT_APP_ID);
  }, [application]);

  return null;
}
