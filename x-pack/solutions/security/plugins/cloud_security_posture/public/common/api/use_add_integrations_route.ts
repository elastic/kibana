/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { useKibana } from '../hooks/use_kibana';

export const useAddIntegrationRoute = (
  category: 'misconfiguration_workflow' | 'vulnerability_workflow'
) => {
  const { application } = useKibana().services;
  const integrationsPath = application.getUrlForApp(INTEGRATIONS_PLUGIN_ID);
  const navLinkAccess = application.capabilities.navLinks?.[INTEGRATIONS_PLUGIN_ID];

  const addIntegrationPath = navLinkAccess
    ? `${integrationsPath}/browse/security/${category}`
    : undefined;

  return addIntegrationPath;
};
