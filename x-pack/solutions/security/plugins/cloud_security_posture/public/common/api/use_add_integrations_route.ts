/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useCisKubernetesIntegration } from './use_cis_kubernetes_integration';

export const useAddIntegrationRoute = (
  category: 'misconfiguration_workflow' | 'vulnerability_workflow'
) => {
  const cisIntegration = useCisKubernetesIntegration();

  if (!cisIntegration.isSuccess) return;

  const addIntegrationPath = pagePathGetters
    .integrations_all({ category: 'security', subCategory: `${category}` })
    .join('');

  return addIntegrationPath;
};
