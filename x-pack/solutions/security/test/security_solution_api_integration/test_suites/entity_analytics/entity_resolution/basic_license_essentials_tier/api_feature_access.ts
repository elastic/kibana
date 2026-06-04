/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ENTITY_STORE_ROUTES, API_VERSIONS } from '@kbn/entity-store/common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const ENTERPRISE_LICENSE_MESSAGE = 'Entity Resolution requires an Enterprise license';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  // Request bodies/queries below are placeholders — `enterpriseLicenseMiddleware`
  // fires before request validation, so any well-formed payload triggers the 403.
  describe('@ess basic license api access', function () {
    this.tags('skipFIPS');
    it('should reject link with 403', async () => {
      const { status, body } = await supertest
        .post(ENTITY_STORE_ROUTES.public.RESOLUTION_LINK)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .send({ target_id: 'any-id', entity_ids: ['another-id'] });

      expect(status).toBe(403);
      expect(body.message).toBe(ENTERPRISE_LICENSE_MESSAGE);
    });

    it('should reject unlink with 403', async () => {
      const { status, body } = await supertest
        .post(ENTITY_STORE_ROUTES.public.RESOLUTION_UNLINK)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.public.v1)
        .send({ entity_ids: ['any-id'] });

      expect(status).toBe(403);
      expect(body.message).toBe(ENTERPRISE_LICENSE_MESSAGE);
    });

    it('should reject group with 403', async () => {
      const { status, body } = await supertest
        .get(ENTITY_STORE_ROUTES.public.RESOLUTION_GROUP)
        .query({ entity_id: 'any-id' })
        .set('elastic-api-version', API_VERSIONS.public.v1);

      expect(status).toBe(403);
      expect(body.message).toBe(ENTERPRISE_LICENSE_MESSAGE);
    });
  });
};
