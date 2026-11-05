/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

const mitreAttackApiFactory = (agent: SuperTest.Agent) => ({
  getEntities(query: Record<string, unknown> = {}) {
    return agent
      .get(GET_MITRE_ENTITIES_URL)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .query(query);
  },
});

/** FTR service wrapping the GET /internal/mitre/entities route, bound to the default admin agent. */
export function MitreAttackApiProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  return {
    ...mitreAttackApiFactory(supertest),
    /**
     * Rebinds the same request methods to another agent, mirroring the `withUser` escape hatch on
     * the generated Security Solution API clients (e.g. `detectionsApi.withUser`). Those build the
     * agent from basic auth credentials, which only works on ESS; this takes an already role-scoped
     * agent from `securitySolutionUtils.createSuperTestWithCustomRole` so it works on serverless too.
     */
    withRoleScopedAgent: (agent: SuperTest.Agent) => mitreAttackApiFactory(agent),
  };
}
