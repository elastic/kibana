/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

export function deleteConnector(supertest: SuperTest.Agent, connectorId: string): SuperTest.Test {
  return supertest.delete(`/api/actions/connector/${connectorId}`).set('kbn-xsrf', 'foo');
}
