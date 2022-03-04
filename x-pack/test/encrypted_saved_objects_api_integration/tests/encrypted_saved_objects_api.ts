/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObject } from 'src/core/server';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const randomness = getService('randomness');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const security = getService('security');

  const SAVED_OBJECT_WITH_SECRET_TYPE = 'saved-object-with-secret';
  const HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE = 'hidden-saved-object-with-secret';
  const SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE =
    'saved-object-with-secret-and-multiple-spaces';
  const SAVED_OBJECT_WITHOUT_SECRET_TYPE = 'saved-object-without-secret';

  function runTests(
    encryptedSavedObjectType: string,
    getURLAPIBaseURL: () => string,
    generateRawID: (id: string, type: string) => string
  ) {
    async function getRawSavedObjectAttributes({ id, type }: SavedObject) {
      const { _source } = await es.get<Record<string, any>>({
        id: generateRawID(id, type),
        index: '.kibana',
      });
      return _source?.[type];
    }

    let savedObjectOriginalAttributes: {
      publicProperty: string;
      publicPropertyStoredEncrypted: string;
      privateProperty: string;
      publicPropertyExcludedFromAAD: string;
    };

    let savedObject: SavedObject;
    beforeEach(async () => {
      savedObjectOriginalAttributes = {
        publicProperty: randomness.string(),
        publicPropertyStoredEncrypted: randomness.string(),
        privateProperty: randomness.string(),
        publicPropertyExcludedFromAAD: randomness.string(),
      };

      const { body } = await supertest
        .post(`${getURLAPIBaseURL()}${encryptedSavedObjectType}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: savedObjectOriginalAttributes })
        .expect(200);

      savedObject = body;
    });

    it('#create encrypts attributes and strips them from response', async () => {
      expect(savedObject.attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
        publicPropertyStoredEncrypted: savedObjectOriginalAttributes.publicPropertyStoredEncrypted,
      });

      const rawAttributes = await getRawSavedObjectAttributes(savedObject);
      expect(rawAttributes.publicProperty).to.be(savedObjectOriginalAttributes.publicProperty);
      expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
        savedObjectOriginalAttributes.publicPropertyExcludedFromAAD
      );

      expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be.empty();
      expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be(
        savedObjectOriginalAttributes.publicPropertyStoredEncrypted
      );
      expect(rawAttributes.privateProperty).to.not.be.empty();
      expect(rawAttributes.privateProperty).to.not.be(
        savedObjectOriginalAttributes.privateProperty
      );
    });

    it('#bulkCreate encrypts attributes and strips them from response', async () => {
      const bulkCreateParams = [
        {
          type: encryptedSavedObjectType,
          attributes: {
            publicProperty: randomness.string(),
            publicPropertyExcludedFromAAD: randomness.string(),
            publicPropertyStoredEncrypted: randomness.string(),
            privateProperty: randomness.string(),
          },
        },
        {
          type: encryptedSavedObjectType,
          attributes: {
            publicProperty: randomness.string(),
            publicPropertyExcludedFromAAD: randomness.string(),
            publicPropertyStoredEncrypted: randomness.string(),
            privateProperty: randomness.string(),
          },
        },
      ];

      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .post(`${getURLAPIBaseURL()}_bulk_create`)
        .set('kbn-xsrf', 'xxx')
        .send(bulkCreateParams)
        .expect(200);

      expect(savedObjects).to.have.length(bulkCreateParams.length);
      for (let index = 0; index < savedObjects.length; index++) {
        const attributesFromResponse = savedObjects[index].attributes;
        const attributesFromRequest = bulkCreateParams[index].attributes;
        const rawAttributes = await getRawSavedObjectAttributes(savedObjects[index]);

        expect(attributesFromResponse).to.eql({
          publicProperty: attributesFromRequest.publicProperty,
          publicPropertyExcludedFromAAD: attributesFromRequest.publicPropertyExcludedFromAAD,
          publicPropertyStoredEncrypted: attributesFromRequest.publicPropertyStoredEncrypted,
        });

        expect(rawAttributes.publicProperty).to.be(attributesFromRequest.publicProperty);
        expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
          attributesFromRequest.publicPropertyExcludedFromAAD
        );
        expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be.empty();
        expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be(
          attributesFromRequest.publicPropertyStoredEncrypted
        );
        expect(rawAttributes.privateProperty).to.not.be.empty();
        expect(rawAttributes.privateProperty).to.not.be(attributesFromRequest.privateProperty);
      }
    });

    it('#bulkCreate with different types encrypts attributes and strips them from response when necessary', async () => {
      const bulkCreateParams = [
        {
          type: encryptedSavedObjectType,
          attributes: {
            publicProperty: randomness.string(),
            publicPropertyExcludedFromAAD: randomness.string(),
            publicPropertyStoredEncrypted: randomness.string(),
            privateProperty: randomness.string(),
          },
        },
        {
          type: SAVED_OBJECT_WITHOUT_SECRET_TYPE,
          attributes: {
            publicProperty: randomness.string(),
          },
        },
      ];

      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .post(`${getURLAPIBaseURL()}_bulk_create`)
        .set('kbn-xsrf', 'xxx')
        .send(bulkCreateParams)
        .expect(200);

      expect(savedObjects).to.have.length(bulkCreateParams.length);
      for (let index = 0; index < savedObjects.length; index++) {
        const attributesFromResponse = savedObjects[index].attributes;
        const attributesFromRequest = bulkCreateParams[index].attributes;

        const type = savedObjects[index].type;
        expect(type).to.be.eql(bulkCreateParams[index].type);

        const rawAttributes = await getRawSavedObjectAttributes(savedObjects[index]);
        if (type === SAVED_OBJECT_WITHOUT_SECRET_TYPE) {
          expect(attributesFromResponse).to.eql(attributesFromRequest);
          expect(attributesFromRequest).to.eql(rawAttributes);
        } else {
          expect(attributesFromResponse).to.eql({
            publicProperty: attributesFromRequest.publicProperty,
            publicPropertyExcludedFromAAD: attributesFromRequest.publicPropertyExcludedFromAAD,
            publicPropertyStoredEncrypted: attributesFromRequest.publicPropertyStoredEncrypted,
          });

          expect(rawAttributes.publicProperty).to.be(attributesFromRequest.publicProperty);
          expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
            attributesFromRequest.publicPropertyExcludedFromAAD
          );
          expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be.empty();
          expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be(
            attributesFromRequest.publicPropertyStoredEncrypted
          );
          expect(rawAttributes.privateProperty).to.not.be.empty();
          expect(rawAttributes.privateProperty).to.not.be(attributesFromRequest.privateProperty);
        }
      }
    });

    it('#get strips encrypted attributes from response', async () => {
      const { body: response } = await supertest
        .get(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
        publicPropertyStoredEncrypted: savedObjectOriginalAttributes.publicPropertyStoredEncrypted,
      });
      expect(response.error).to.be(undefined);
    });

    it('#get strips all encrypted attributes from response if decryption fails', async () => {
      // Update non-encrypted property that is included into AAD to make it impossible to decrypt
      // encrypted attributes.
      const updatedPublicProperty = randomness.string();
      await supertest
        .put(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: { publicProperty: updatedPublicProperty } })
        .expect(200);

      const { body: response } = await supertest
        .get(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: updatedPublicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
      });
      expect(response.error).to.eql({
        message: 'Unable to decrypt attribute "publicPropertyStoredEncrypted"',
      });
    });

    it('#find strips encrypted attributes from response', async () => {
      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .get(`${getURLAPIBaseURL()}_find?type=${encryptedSavedObjectType}`)
        .expect(200);

      expect(savedObjects).to.have.length(1);
      expect(savedObjects[0].id).to.be(savedObject.id);
      expect(savedObjects[0].attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
        publicPropertyStoredEncrypted: savedObjectOriginalAttributes.publicPropertyStoredEncrypted,
      });
      expect(savedObjects[0].error).to.be(undefined);
    });

    it('#find strips all encrypted attributes from response if decryption fails', async () => {
      // Update non-encrypted property that is included into AAD to make it impossible to decrypt
      // encrypted attributes.
      const updatedPublicProperty = randomness.string();
      await supertest
        .put(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: { publicProperty: updatedPublicProperty } })
        .expect(200);

      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .get(`${getURLAPIBaseURL()}_find?type=${encryptedSavedObjectType}`)
        .expect(200);

      expect(savedObjects).to.have.length(1);
      expect(savedObjects[0].id).to.be(savedObject.id);
      expect(savedObjects[0].attributes).to.eql({
        publicProperty: updatedPublicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
      });
      expect(savedObjects[0].error).to.eql({
        message: 'Unable to decrypt attribute "publicPropertyStoredEncrypted"',
      });
    });

    it('#bulkGet strips encrypted attributes from response', async () => {
      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .post(`${getURLAPIBaseURL()}_bulk_get`)
        .set('kbn-xsrf', 'xxx')
        .send([{ type: savedObject.type, id: savedObject.id }])
        .expect(200);

      expect(savedObjects).to.have.length(1);
      expect(savedObjects[0].id).to.be(savedObject.id);
      expect(savedObjects[0].attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
        publicPropertyStoredEncrypted: savedObjectOriginalAttributes.publicPropertyStoredEncrypted,
      });
      expect(savedObjects[0].error).to.be(undefined);
    });

    it('#bulkGet strips all encrypted attributes from response if decryption fails', async () => {
      // Update non-encrypted property that is included into AAD to make it impossible to decrypt
      // encrypted attributes.
      const updatedPublicProperty = randomness.string();
      await supertest
        .put(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: { publicProperty: updatedPublicProperty } })
        .expect(200);

      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .post(`${getURLAPIBaseURL()}_bulk_get`)
        .set('kbn-xsrf', 'xxx')
        .send([{ type: savedObject.type, id: savedObject.id }])
        .expect(200);

      expect(savedObjects).to.have.length(1);
      expect(savedObjects[0].id).to.be(savedObject.id);
      expect(savedObjects[0].attributes).to.eql({
        publicProperty: updatedPublicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
      });
      expect(savedObjects[0].error).to.eql({
        message: 'Unable to decrypt attribute "publicPropertyStoredEncrypted"',
      });
    });

    it('#update encrypts attributes and strips them from response', async () => {
      const updatedAttributes = {
        publicProperty: randomness.string(),
        publicPropertyExcludedFromAAD: randomness.string(),
        publicPropertyStoredEncrypted: randomness.string(),
        privateProperty: randomness.string(),
      };

      const { body: response } = await supertest
        .put(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: updatedAttributes })
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: updatedAttributes.publicProperty,
        publicPropertyExcludedFromAAD: updatedAttributes.publicPropertyExcludedFromAAD,
        publicPropertyStoredEncrypted: updatedAttributes.publicPropertyStoredEncrypted,
      });

      const rawAttributes = await getRawSavedObjectAttributes(savedObject);
      expect(rawAttributes.publicProperty).to.be(updatedAttributes.publicProperty);
      expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
        updatedAttributes.publicPropertyExcludedFromAAD
      );
      expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be.empty();
      expect(rawAttributes.publicPropertyStoredEncrypted).to.not.be(
        updatedAttributes.publicPropertyStoredEncrypted
      );

      expect(rawAttributes.privateProperty).to.not.be.empty();
      expect(rawAttributes.privateProperty).to.not.be(updatedAttributes.privateProperty);
    });

    it('#getDecryptedAsInternalUser decrypts and returns all attributes', async () => {
      const { body: decryptedResponse } = await supertest
        .get(
          `${getURLAPIBaseURL()}get-decrypted-as-internal-user/${encryptedSavedObjectType}/${
            savedObject.id
          }`
        )
        .expect(200);

      expect(decryptedResponse.attributes).to.eql(savedObjectOriginalAttributes);
    });

    it('#getDecryptedAsInternalUser is able to decrypt if non-AAD attribute has changed', async () => {
      const updatedAttributes = { publicPropertyExcludedFromAAD: randomness.string() };

      const { body: response } = await supertest
        .put(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: updatedAttributes })
        .expect(200);

      expect(response.attributes).to.eql({
        publicPropertyExcludedFromAAD: updatedAttributes.publicPropertyExcludedFromAAD,
      });

      const { body: decryptedResponse } = await supertest
        .get(
          `${getURLAPIBaseURL()}get-decrypted-as-internal-user/${encryptedSavedObjectType}/${
            savedObject.id
          }`
        )
        .expect(200);

      expect(decryptedResponse.attributes).to.eql({
        ...savedObjectOriginalAttributes,
        publicPropertyExcludedFromAAD: updatedAttributes.publicPropertyExcludedFromAAD,
      });
    });

    it('#getDecryptedAsInternalUser fails to decrypt if AAD attribute has changed', async () => {
      const updatedAttributes = { publicProperty: randomness.string() };

      const { body: response } = await supertest
        .put(`${getURLAPIBaseURL()}${encryptedSavedObjectType}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: updatedAttributes })
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: updatedAttributes.publicProperty,
      });

      // Bad request means that we successfully detected "EncryptionError" (not unexpected one).
      await supertest
        .get(
          `${getURLAPIBaseURL()}get-decrypted-as-internal-user/${encryptedSavedObjectType}/${
            savedObject.id
          }`
        )
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Failed to encrypt attributes',
        });
    });
  }

  describe('encrypted saved objects API', () => {
    function generateRawId(id: string, type: string, spaceId?: string) {
      return `${
        spaceId && type !== SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE
          ? `${spaceId}:${type}`
          : type
      }:${id}`;
    }

    describe('within a default space', () => {
      afterEach(async () => {
        await es.deleteByQuery({
          index: '.kibana',
          q: `type:${SAVED_OBJECT_WITH_SECRET_TYPE} OR type:${HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE} OR type:${SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE} OR type:${SAVED_OBJECT_WITHOUT_SECRET_TYPE}`,
          refresh: true,
          body: {},
        });
      });

      describe('with `single` namespace saved object', () => {
        runTests(
          SAVED_OBJECT_WITH_SECRET_TYPE,
          () => '/api/saved_objects/',
          (id, type) => generateRawId(id, type)
        );
      });

      describe('hidden type with `single` namespace saved object', () => {
        runTests(
          HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE,
          () => '/api/hidden_saved_objects/',
          (id, type) => generateRawId(id, type)
        );
      });

      describe('with `multiple` namespace saved object', () => {
        runTests(
          SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE,
          () => '/api/saved_objects/',
          (id, type) => generateRawId(id, type)
        );
      });
    });

    describe('within a custom space', () => {
      const SPACE_ID = 'eso';

      before(async () => {
        await supertest
          .post('/api/spaces/space')
          .set('kbn-xsrf', 'xxx')
          .send({ id: SPACE_ID, name: SPACE_ID })
          .expect(200);
      });

      after(async () => {
        await supertest.delete(`/api/spaces/space/${SPACE_ID}`).set('kbn-xsrf', 'xxx').expect(204);
      });

      afterEach(async () => {
        await es.deleteByQuery({
          index: '.kibana',
          q: `type:${SAVED_OBJECT_WITH_SECRET_TYPE} OR type:${HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE} OR type:${SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE} OR type:${SAVED_OBJECT_WITHOUT_SECRET_TYPE}`,
          refresh: true,
          body: {},
        });
      });

      describe('with `single` namespace saved object', () => {
        runTests(
          SAVED_OBJECT_WITH_SECRET_TYPE,
          () => `/s/${SPACE_ID}/api/saved_objects/`,
          (id, type) => generateRawId(id, type, SPACE_ID)
        );
      });

      describe('with `multiple` namespace saved object', () => {
        runTests(
          SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE,
          () => `/s/${SPACE_ID}/api/saved_objects/`,
          (id, type) => generateRawId(id, type, SPACE_ID)
        );
      });
    });

    describe('migrations', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/encrypted_saved_objects'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/encrypted_saved_objects'
        );
      });

      function getGetApiUrl({ objectId, spaceId }: { objectId: string; spaceId?: string }) {
        const spacePrefix = spaceId ? `/s/${spaceId}` : '';
        return `${spacePrefix}/api/saved_objects/get-decrypted-as-internal-user/saved-object-with-migration/${objectId}`;
      }

      // For brevity, each encrypted saved object has the same decrypted attributes after migrations/conversion.
      // An assertion based on this ensures all encrypted fields can still be decrypted after migrations/conversion have been applied.
      const expectedDecryptedAttributes = {
        encryptedAttribute: 'this is my secret api key',
        nonEncryptedAttribute: 'elastic-migrated', // this field was migrated in 7.8.0
        additionalEncryptedAttribute: 'elastic-migrated-encrypted', // this field was added in 7.9.0
      };

      // In these test cases, we simulate a scenario where some existing objects that are migrated when Kibana starts up. Note that when a
      // document migration is triggered, the saved object "convert" transform is also applied by the Core migration algorithm.
      describe('handles index migration correctly', () => {
        describe('in the default space', () => {
          it('for a saved object that needs to be migrated before it is converted', async () => {
            const getApiUrl = getGetApiUrl({ objectId: '74f3e6d7-b7bb-477d-ac28-92ee22728e6e' });
            const { body: decryptedResponse } = await supertest.get(getApiUrl).expect(200);
            expect(decryptedResponse.attributes).to.eql(expectedDecryptedAttributes);
          });

          it('for a saved object that does not need to be migrated before it is converted', async () => {
            const getApiUrl = getGetApiUrl({ objectId: '362828f0-eef2-11eb-9073-11359682300a' });
            const { body: decryptedResponse } = await supertest.get(getApiUrl).expect(200);
            expect(decryptedResponse.attributes).to.eql(expectedDecryptedAttributes);
          });
        });

        describe('in a custom space', () => {
          const spaceId = 'custom-space';

          it('for a saved object that needs to be migrated before it is converted', async () => {
            const getApiUrl = getGetApiUrl({
              objectId: 'a98e22f8-530e-5d69-baf7-97526796f3a6', // This ID is not found in the data.json file, it is dynamically generated when the object is converted; the original ID is a67c6950-eed8-11eb-9a62-032b4e4049d1
              spaceId,
            });
            const { body: decryptedResponse } = await supertest.get(getApiUrl).expect(200);
            expect(decryptedResponse.attributes).to.eql(expectedDecryptedAttributes);
          });

          it('for a saved object that does not need to be migrated before it is converted', async () => {
            const getApiUrl = getGetApiUrl({
              objectId: '41395c74-da7a-5679-9535-412d550a6cf7', // This ID is not found in the data.json file, it is dynamically generated when the object is converted; the original ID is 36448a90-eef2-11eb-9073-11359682300a
              spaceId,
            });
            const { body: decryptedResponse } = await supertest.get(getApiUrl).expect(200);
            expect(decryptedResponse.attributes).to.eql(expectedDecryptedAttributes);
          });
        });
      });

      // In these test cases, we simulate a scenario where new objects are migrated upon creation. This happens because an outdated
      // `migrationVersion` field is included below. Note that when a document migration is triggered, the saved object "convert" transform
      // is *not* applied by the Core migration algorithm.
      describe('handles document migration correctly', () => {
        function getCreateApiUrl({ spaceId }: { spaceId?: string } = {}) {
          const spacePrefix = spaceId ? `/s/${spaceId}` : '';
          return `${spacePrefix}/api/saved_objects/saved-object-with-migration`;
        }

        const objectToCreate = {
          attributes: {
            encryptedAttribute: 'this is my secret api key',
            nonEncryptedAttribute: 'elastic',
          },
          migrationVersion: { 'saved-object-with-migration': '7.7.0' },
        };

        it('in the default space', async () => {
          const createApiUrl = getCreateApiUrl();
          const { body: savedObject } = await supertest
            .post(createApiUrl)
            .set('kbn-xsrf', 'xxx')
            .send(objectToCreate)
            .expect(200);
          const { id: objectId } = savedObject;

          const getApiUrl = getGetApiUrl({ objectId });
          const { body: decryptedResponse } = await supertest.get(getApiUrl).expect(200);
          expect(decryptedResponse.attributes).to.eql(expectedDecryptedAttributes);
        });

        it('in a custom space', async () => {
          const spaceId = 'custom-space';
          const createApiUrl = getCreateApiUrl({ spaceId });
          const { body: savedObject } = await supertest
            .post(createApiUrl)
            .set('kbn-xsrf', 'xxx')
            .send(objectToCreate)
            .expect(200);
          const { id: objectId } = savedObject;

          const getApiUrl = getGetApiUrl({ objectId, spaceId });
          const { body: decryptedResponse } = await supertest.get(getApiUrl).expect(200);
          expect(decryptedResponse.attributes).to.eql(expectedDecryptedAttributes);
        });
      });
    });

    describe('key rotation', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');
      const savedObjectsEncryptedWithLegacyKeys: Array<[string, string, string[], boolean]> = [
        [SAVED_OBJECT_WITH_SECRET_TYPE, 'cd9272b2-6a15-4295-bb7b-15f6347e267b', ['default'], false],
        [
          SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE,
          '6b388d9b-6d8f-4e20-ba38-d9477370729d',
          ['a', 'default'],
          false,
        ],
        [
          HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE,
          '8d90daef-f992-443c-ab78-053c6a7b0e9c',
          ['default'],
          true,
        ],
        [SAVED_OBJECT_WITH_SECRET_TYPE, '4336f782-450f-4142-aecd-b46ed092af52', ['default'], false],
        [
          SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE,
          '2ee1bede-400d-4767-b3f0-09a7064bec14',
          ['a', 'default'],
          false,
        ],
        [
          HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE,
          '506038a1-ec71-42b5-bce2-99661b29c62b',
          ['default'],
          true,
        ],
      ];

      const KIBANA_ADMIN_USERNAME = 'admin';
      const KIBANA_ADMIN_PASSWORD = 'changeme';
      before(async () => {
        await security.user.create(KIBANA_ADMIN_USERNAME, {
          password: KIBANA_ADMIN_PASSWORD,
          roles: ['kibana_admin'],
          full_name: 'a kibana admin',
        });
        await esArchiver.load(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/key_rotation'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/encrypted_saved_objects_api_integration/fixtures/es_archiver/key_rotation'
        );
        await security.user.delete('admin');
      });

      it('#get can properly retrieve objects encrypted with the legacy keys', async () => {
        // Hidden objects cannot be retrieved with standard Saved Objects APIs.
        for (const [type, id, namespaces] of savedObjectsEncryptedWithLegacyKeys.filter(
          ([, , , hiddenSavedObject]) => !hiddenSavedObject
        )) {
          const { body: decryptedResponse } = await supertest
            .get(`/api/saved_objects/${type}/${id}`)
            .expect(200);

          expect(decryptedResponse.namespaces.sort()).to.eql(namespaces);
          expect(decryptedResponse.attributes).to.eql({
            publicProperty: 'some-public-property-0',
            publicPropertyExcludedFromAAD: 'some-public-property-excluded-from-aad-0',
            publicPropertyStoredEncrypted: 'some-public-but-encrypted-property-0',
          });
        }
      });

      it('#get-decrypted-as-internal-user can properly retrieve objects encrypted with the legacy keys', async () => {
        for (const [type, id, namespaces, hidden] of savedObjectsEncryptedWithLegacyKeys) {
          const url = hidden
            ? `/api/hidden_saved_objects/get-decrypted-as-internal-user/${type}/${id}`
            : `/api/saved_objects/get-decrypted-as-internal-user/${type}/${id}`;
          const { body: decryptedResponse } = await supertest.get(url).expect(200);

          expect(decryptedResponse.namespaces.sort()).to.eql(namespaces);
          expect(decryptedResponse.attributes).to.eql({
            privateProperty: 'some-private-property-0',
            publicProperty: 'some-public-property-0',
            publicPropertyExcludedFromAAD: 'some-public-property-excluded-from-aad-0',
            publicPropertyStoredEncrypted: 'some-public-but-encrypted-property-0',
          });
        }
      });

      it('non-super user cannot rotate encryption key', async () => {
        await supertestWithoutAuth
          .post('/api/encrypted_saved_objects/_rotate_key')
          .set('kbn-xsrf', 'xxx')
          .auth(KIBANA_ADMIN_USERNAME, KIBANA_ADMIN_PASSWORD)
          .send()
          .expect(403);
      });

      // Since this test re-encrypts objects it should always go last in this suite.
      it('encryption key can be properly rotated by the superuser', async () => {
        await supertest
          .post('/api/encrypted_saved_objects/_rotate_key')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200, { total: 6, successful: 6, failed: 0 });

        for (const [type, id, namespaces, hidden] of savedObjectsEncryptedWithLegacyKeys) {
          const url = hidden
            ? `/api/hidden_saved_objects/get-decrypted-as-internal-user/${type}/${id}`
            : `/api/saved_objects/get-decrypted-as-internal-user/${type}/${id}`;
          const { body: decryptedResponse } = await supertest.get(url).expect(200);

          expect(decryptedResponse.namespaces.sort()).to.eql(namespaces);
          expect(decryptedResponse.attributes).to.eql({
            privateProperty: 'some-private-property-0',
            publicProperty: 'some-public-property-0',
            publicPropertyExcludedFromAAD: 'some-public-property-excluded-from-aad-0',
            publicPropertyStoredEncrypted: 'some-public-but-encrypted-property-0',
          });
        }
      });
    });
  });
}
