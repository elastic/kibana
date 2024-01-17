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

      it(`successfully decrypts 'alert' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/alert/903b890f-4e98-4ea5-bc10-71433f01de18`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.apiKey).to.eql(
          'b0F0U0ZJMEJJbVVLTnNEYUw2cHU6RDJSLUNYWFNReWVqSF8tMFVNXzQ5Zw=='
        );
      });

      it(`successfully decrypts 'action' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/action/1e78caea-c2d9-47ec-bba5-5b69c211c274`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.secrets).to.eql({ token: 'some-random-token-value' });
      });

      it(`successfully decrypts 'synthetics-param' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/synthetics-param/c3938846-6927-4c8e-8af1-d25b4d3da0ca`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.value).to.eql(
          'This value was encrypted prior to the AAD include list change.'
        );
      });

      it(`successfully decrypts 'synthetics-monitor' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/synthetics-monitor/85e2583e-d02e-4cff-8b23-a91ae75e8dc2`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        const secrets = JSON.parse(decryptedObject.attributes.secrets);
        expect(secrets).to.eql({
          params: '',
          'source.inline.script': `step('Go to localhost', async () => {\n  await page.goto('localhost');\n});`,
          'source.project.content': '',
          synthetics_args: ['param1', 'param2', 'param3'],
          'ssl.key': '',
          'ssl.key_passphrase': '',
        });
      });
    });
  });
}
