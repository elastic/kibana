/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IS_SERVERLESS } from '../../env_var_names_constants';

type DefaultUsername = 'platform_engineer' | 'system_indices_superuser';

export const getDefaultUsername = (): DefaultUsername => {
  const isServerless: boolean = Cypress.env(IS_SERVERLESS);
  return isServerless ? 'platform_engineer' : 'system_indices_superuser';
};
