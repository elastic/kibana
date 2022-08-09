/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import semverCoerce from 'semver/functions/coerce';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('Agent available_versions API', () => {
    it('should return a non empty list of versions', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      const kibanaVersionCoerced = semverCoerce(kibanaVersion)?.version;

      const res = await supertest.get(`/api/fleet/agents/available_versions`).expect(200);
      const expectedVersions = res.body.items;
      expect(expectedVersions).to.contain(kibanaVersionCoerced);
      expect(expectedVersions.length).to.greaterThan(0);
    });
  });
}
