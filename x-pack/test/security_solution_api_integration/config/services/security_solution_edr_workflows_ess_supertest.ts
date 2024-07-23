/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { format as formatUrl } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context_edr_workflows';

import { ROLE } from './security_solution_edr_workflows_roles_users';

export async function SecuritySolutionEdrWorkflowsEssSuperTest({ getService }: FtrProviderContext) {
  const { createSuperTest } = getService('securitySolutionUtils');
  const config = getService('config');

  return {
    supertest: async (role?: ROLE, password: string = 'changeme') => {
      const supertestInstance = await createSuperTest();
      if (!role) {
        return supertestInstance;
      }

      const kbnUrl = formatUrl({
        ...config.get('servers.kibana'),
        auth: false,
      });

      return supertest.agent(kbnUrl).auth(role, password);
    },
  };
}
