/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_SERVERLESS } from '../../env_var_names_constants';

type DefaultUsername = 'testing-internal' | 'system_indices_superuser';

export const getDefaultUsername = (): DefaultUsername => {
  const isMKIserverless: boolean = Cypress.env(CLOUD_SERVERLESS);
  return isMKIserverless ? 'testing-internal' : 'system_indices_superuser';
};
