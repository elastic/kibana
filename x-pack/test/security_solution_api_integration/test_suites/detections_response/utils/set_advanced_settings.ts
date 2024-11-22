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

import type SuperTest from 'supertest';

export const setAdvancedSettings = async (
  supertest: SuperTest.Agent,
  settings: Record<string, string[] | string | number | boolean>
) => {
  return supertest
    .post('/internal/kibana/settings')
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ changes: settings })
    .expect(200);
};
