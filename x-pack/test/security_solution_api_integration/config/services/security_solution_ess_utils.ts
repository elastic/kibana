/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { FtrProviderContextWithSpaces } from '../../ftr_provider_context_with_spaces';
import { SecuritySolutionESSUtilsInterface } from './types';

export function SecuritySolutionESSUtils({
  getService,
}: FtrProviderContextWithSpaces): SecuritySolutionESSUtilsInterface {
  const config = getService('config');
  const search = getService('search');
  const supertestWithoutAuth = getService('supertest');

  return {
    getUsername: (_role?: string) =>
      Promise.resolve(config.get('servers.kibana.username') as string),
    createSearch: (_role?: string) => Promise.resolve(search),
    createSuperTest: async (role?: string, password: string = 'changeme') => {
      if (!role) {
        return supertestWithoutAuth;
      }
      const kbnUrl = formatUrl({
        ...config.get('servers.kibana'),
        auth: false,
      });

      return supertest.agent(kbnUrl).auth(role, password);
    },
  };
}
