/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('encrypted saved objects decryption', () => {
    // This test uses esArchiver to load snapshots of encrypted objects which were captured from the main branch prior to
    // the AAD include list change. It then uses get-decrypted-as-internal-user to attempt to decrypt each encrypted object.
    describe('aad exclude list to include list', () => {
      before(async () => {
        await es.indices.putMapping({ index: MAIN_SAVED_OBJECT_INDEX, dynamic: true });
        await esArchiver.load(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/encrypted_saved_objects_pre_aad_change'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/encrypted_saved_objects_pre_aad_change'
        );
      });

      it(`successfully decrypts 'fleet-message-signing-keys' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/fleet-message-signing-keys/15d50edc-e8aa-4856-a5a3-df0188c4f550`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.passphrase).to.eql('This is the passphrase');
      });
    });
  });
}
