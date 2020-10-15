/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Opts {
  supertest: any;
  spaceId?: string;
  type: string;
  id: string;
}

export async function checkAAD({ supertest, spaceId, type, id }: Opts) {
  await supertest
    .post('/api/check_aad')
    .set('kbn-xsrf', 'foo')
    .send({ spaceId, type, id })
    .expect(200, { success: true });
}
