/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleScopedSupertestProvider } from '../../../services/role_scoped_supertest';

export interface TestSource {
  id: string;
  viewName: string;
}

/**
 * Creates a Nightshift source the KI routes can address. Feature and query
 * writes take a source id; a stream name is a 404.
 */
export async function createTestSource(
  roleScopedSupertest: ReturnType<typeof RoleScopedSupertestProvider>,
  title: string,
  esql: string
): Promise<TestSource> {
  const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
    useCookieHeader: true,
    withInternalHeaders: true,
  });
  const response = await supertest
    .post('/internal/nightshift/sources')
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'kibana')
    .send({ title, esql })
    .expect(200);

  return { id: response.body.source.id, viewName: response.body.source.view_name };
}

export async function deleteTestSource(
  roleScopedSupertest: ReturnType<typeof RoleScopedSupertestProvider>,
  id: string
): Promise<void> {
  const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
    useCookieHeader: true,
    withInternalHeaders: true,
  });
  await supertest
    .delete(`/internal/nightshift/sources/${id}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'kibana')
    .expect(200);
}
