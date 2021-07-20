/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('encrypted saved objects decryption', () => {
    describe('migrations', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/encrypted_saved_objects_different_key'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/encrypted_saved_objects_different_key'
        );
      });

      it('migrates alert and actions saved objects even if decryption fails', async () => {
        const { body: migratedRule } = await supertest
          .get(`/api/alerting/rule/a0d18560-e985-11eb-b1e3-5b27f0de1e72`)
          .expect(200);

        await supertest
          .get(
            `/api/saved_objects/get-decrypted-as-internal-user/alert/a0d18560-e985-11eb-b1e3-5b27f0de1e72`
          )
          .expect(500);

        expect(migratedRule.notify_when).to.eql('onActiveAlert');
        expect(migratedRule.updated_at).to.eql('2021-07-20T18:09:35.093Z');

        const { body: migratedConnector } = await supertest
          .get(`/api/actions/connector/b9127990-e985-11eb-b1e3-5b27f0de1e72`)
          .expect(200);

        await supertest
          .get(
            `/api/saved_objects/get-decrypted-as-internal-user/action/b9127990-e985-11eb-b1e3-5b27f0de1e72`
          )
          .expect(500);

        expect(migratedConnector.is_missing_secrets).to.eql(false);
      });
    });
  });
}
