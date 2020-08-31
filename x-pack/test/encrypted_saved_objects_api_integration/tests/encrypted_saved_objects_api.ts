/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SavedObject } from 'src/core/server';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const randomness = getService('randomness');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

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
      const {
        _source: { [type]: savedObject },
      } = await es.get({
        id: generateRawID(id, type),
        index: '.kibana',
      });

      return savedObject;
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

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.kibana',
        q: `type:${SAVED_OBJECT_WITH_SECRET_TYPE} OR type:${HIDDEN_SAVED_OBJECT_WITH_SECRET_TYPE} OR type:${SAVED_OBJECT_WITH_SECRET_AND_MULTIPLE_SPACES_TYPE} OR type:${SAVED_OBJECT_WITHOUT_SECRET_TYPE}`,
        refresh: true,
      });
    });

    describe('within a default space', () => {
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
        await esArchiver.load('encrypted_saved_objects');
      });

      after(async () => {
        await esArchiver.unload('encrypted_saved_objects');
      });

      it('migrates unencrypted fields on saved objects', async () => {
        const { body: decryptedResponse } = await supertest
          .get(
            `/api/saved_objects/get-decrypted-as-internal-user/saved-object-with-migration/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
          )
          .expect(200);

        expect(decryptedResponse.attributes).to.eql({
          // ensures the encrypted field can still be decrypted after the migration
          encryptedAttribute: 'this is my secret api key',
          // ensures the non-encrypted field has been migrated in 7.8.0
          nonEncryptedAttribute: 'elastic-migrated',
          // ensures the non-encrypted field has been migrated into a new encrypted field in 7.9.0
          additionalEncryptedAttribute: 'elastic-migrated-encrypted',
        });
      });
    });
  });
}
