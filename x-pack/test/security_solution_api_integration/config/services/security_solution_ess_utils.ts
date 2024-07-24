/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContextWithSpaces as FtrProviderContext } from '../../ftr_provider_context_with_spaces';
import { SecuritySolutionESSUtilsInterface } from './types';

export function SecuritySolutionESSUtils({
  getService,
}: FtrProviderContext): SecuritySolutionESSUtilsInterface {
  const config = getService('config');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  return {
    getUsername: (_role?: string) =>
      Promise.resolve(config.get('servers.kibana.username') as string),
    createSuperTest: (_role?: string) => Promise.resolve(supertest),
    createBsearch: (_role?: string) => Promise.resolve(bsearch),
  };
}
