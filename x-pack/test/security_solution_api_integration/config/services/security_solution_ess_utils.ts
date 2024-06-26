/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { SecuritySolutionUtils } from './types';

export function SecuritySolutionESSUtils({
  getService,
}: FtrProviderContext): SecuritySolutionUtils {
  const config = getService('config');
  const supertest = getService('supertest');

  return {
    getUsername: (_role?: string) =>
      Promise.resolve(config.get('servers.kibana.username') as string),
    createSuperTest: (_role?: string) => Promise.resolve(supertest),
  };
}
