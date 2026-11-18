/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBack } from '@kbn/app-header';
import { useKibana } from '../hooks/use_kibana';

/**
 * Back target for the CSP dashboards, which are listed under the Security Solution Dashboards page.
 */
export const useDashboardsBackTarget = (): AppHeaderBack => {
  const { application } = useKibana().services;

  return useMemo(
    () => ({
      href: application.getUrlForApp('securitySolutionUI', { deepLinkId: 'dashboards' }),
      label: i18n.translate('xpack.csp.dashboards.backToDashboardsLabel', {
        defaultMessage: 'Dashboards',
      }),
    }),
    [application]
  );
};
