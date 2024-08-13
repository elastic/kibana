/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'supertest';
import { EntityDefinition } from '@kbn/entities-schema';
import { EntityDefinitionWithState } from '@kbn/entityManager-plugin/server/lib/entities/types';

export interface Auth {
  username: string;
  password: string;
}

export const getInstalledDefinitions = async (
  supertest: Agent,
  auth?: Auth
): Promise<{ definitions: EntityDefinitionWithState[] }> => {
  let req = supertest.get('/internal/entities/definition').set('kbn-xsrf', 'xxx');
  if (auth) {
    req = req.auth(auth.username, auth.password);
  }
  const response = await req.send().expect(200);
  return response.body;
};

export const installDefinition = async (
  supertest: Agent,
  definition: EntityDefinition,
  query: Record<string, any> = {}
) => {
  return supertest
    .post('/internal/entities/definition')
    .query(query)
    .set('kbn-xsrf', 'xxx')
    .send(definition)
    .expect(200);
};

export const uninstallDefinition = (supertest: Agent, id: string, deleteData = false) => {
  return supertest
    .delete(`/internal/entities/definition/${id}`)
    .query({ deleteData })
    .set('kbn-xsrf', 'xxx')
    .send()
    .expect(200);
};
