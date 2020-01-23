/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('/api/telemetry/v2/optIn API', () => {
    let kibanaVersion: any;

    before(async () => {
      const kibanaVersionAccessor = kibanaServer.version;
      kibanaVersion = await kibanaVersionAccessor.get();

      expect(typeof kibanaVersion).to.eql('string');
      expect(kibanaVersion.length).to.be.greaterThan(0);
    });

    it('should support sending false', async () => {
      await postTelemetryV2Optin(supertest, false, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(supertest);
      expect(enabled).to.be(false);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should support sending true', async () => {
      await postTelemetryV2Optin(supertest, true, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(supertest);
      expect(enabled).to.be(true);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should not support sending null', async () => {
      await postTelemetryV2Optin(supertest, null, 400);
    });

    it('should not support sending junk', async () => {
      await postTelemetryV2Optin(supertest, 42, 400);
    });
  });
}

async function postTelemetryV2Optin(supertest: any, value: any, statusCode: number): Promise<any> {
  const { body } = await supertest
    .post('/api/telemetry/v2/optIn')
    .set('kbn-xsrf', 'xxx')
    .send({ enabled: value })
    .expect(statusCode);

  return body;
}

async function getSavedObjectAttributes(supertest: any): Promise<any> {
  const { body } = await supertest.get('/api/saved_objects/telemetry/telemetry').expect(200);
  return body.attributes;
}
