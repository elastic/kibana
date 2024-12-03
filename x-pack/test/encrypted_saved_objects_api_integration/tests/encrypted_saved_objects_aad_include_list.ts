/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../ftr_provider_context';

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

      it(`successfully decrypts 'action' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/action/1e78caea-c2d9-47ec-bba5-5b69c211c274`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.secrets).to.eql({ token: 'some-random-token-value' });
      });

      it(`successfully decrypts 'action_task_params' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/action_task_params/248408b1-b3b0-46a0-80fa-e2b6fbc9085d`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.apiKey).to.eql(
          'This api key was encrypted prior to the AAD include list change.'
        );
      });

      it(`successfully decrypts 'connector_token' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/connector_token/601750d9-a82a-4344-ac5c-badfbe12a4ca`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.token).to.eql(
          'Token value encrypted prior to AAD include list change.'
        );
      });

      it(`successfully decrypts 'alert' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/alert/5c892f54-c428-496b-b760-075c01b5fcdd`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.apiKey).to.eql(
          'This api key was encrypted prior to the AAD include list change.'
        );
      });

      it(`successfully decrypts 'api_key_pending_invalidation' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/api_key_pending_invalidation/e67824d0-b428-47c7-be46-fd4e2021519f`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.apiKeyId).to.eql(
          'This api key id was encrypted prior to the AAD include list change.'
        );
      });

      it(`successfully decrypts 'ingest-outputs' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/ingest-outputs/e7e5ea1b-8342-45f3-8051-1bc1448fd923`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        const ssl = JSON.parse(decryptedObject.attributes.ssl);
        expect(ssl).to.eql({
          certificate_authorities: [
            'This SSL CA was encrypted prior to the AAD include list change.',
          ],
          verification_mode: 'full',
        });
        expect(decryptedObject.attributes.password).to.eql(
          'This password was encrypted prior to the AAD include list change.'
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

      it(`successfully decrypts 'fleet-uninstall-tokens' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/fleet-uninstall-tokens/1db22a8f-4cbb-415d-90d1-7608a6923ba1`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.token).to.eql(
          'This token was encrypted prior to the AAD include list change.'
        );
      });

      it(`successfully decrypts 'uptime-synthetics-api-key' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/uptime-synthetics-api-key/b448dffe-6e9c-4032-aa9a-5d9446531b83`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.apiKey).to.eql(
          'This api key was encrypted prior to the AAD include list change.'
        );
      });

      it(`successfully decrypts 'synthetics-monitor' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/synthetics-monitor/305ea066-0f33-47f2-8d15-2bf82c5ea430`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        const secrets = JSON.parse(decryptedObject.attributes.secrets);
        expect(secrets).to.eql({
          params: 'some-params',
          'source.inline.script': `step('Go to localhost', async () => {\n  await page.goto('localhost');\n});`,
          'source.project.content': '',
          synthetics_args: ['param1', 'param2', 'param3'],
          'ssl.key': 'some-ssl-key',
          'ssl.key_passphrase': 'some-passphrase',
        });
      });

      it(`successfully decrypts 'synthetics-param' objects`, async () => {
        const decryptResponse = await supertest
          .get(
            `/api/hidden_saved_objects/get-decrypted-as-internal-user/synthetics-param/a304e397-723a-495c-a934-126504d53d10`
          )
          .expect(200);

        const decryptedObject = JSON.parse(decryptResponse.text);
        expect(decryptedObject.attributes.value).to.eql(
          'This value was encrypted prior to the AAD include list change.'
        );
      });
    });
  });
}
