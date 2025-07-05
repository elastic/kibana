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

export async function installProductDoc(supertest: SuperTest.Agent, inferenceId: string) {
  return supertest
    .post('/internal/product_doc_base/install')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .send({
      inferenceId,
    })
    .expect(200);
}

export async function uninstallProductDoc(supertest: SuperTest.Agent, inferenceId: string) {
  return supertest
    .post('/internal/product_doc_base/uninstall')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .send({
      inferenceId,
    })
    .expect(200);
}
