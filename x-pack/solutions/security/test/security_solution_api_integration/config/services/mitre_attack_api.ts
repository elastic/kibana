/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

/** FTR service that wraps the GET /internal/mitre/entities route. */
export function MitreAttackApiProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  return {
    getEntities(query: Record<string, unknown> = {}) {
      return supertest
        .get(GET_MITRE_ENTITIES_URL)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query(query);
    },
  };
}
