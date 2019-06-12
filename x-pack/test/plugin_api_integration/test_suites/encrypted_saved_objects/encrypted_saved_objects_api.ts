/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SavedObject } from 'src/legacy/server/saved_objects/service';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const es = getService('es');
  const chance = getService('chance');
  const supertest = getService('supertest');

  const SAVED_OBJECT_WITH_SECRET_TYPE = 'saved-object-with-secret';

  function runTests(getURLAPIBaseURL: () => string, generateRawID: (id: string) => string) {
    async function getRawSavedObjectAttributes(id: string) {
      const {
        _source: { [SAVED_OBJECT_WITH_SECRET_TYPE]: savedObject },
      } = await es.get({
        id: generateRawID(id),
        type: '_doc',
        index: '.kibana',
      });

      return savedObject;
    }

    let savedObjectOriginalAttributes: {
      publicProperty: string;
      publicPropertyExcludedFromAAD: string;
      privateProperty: string;
    };

    let savedObject: SavedObject;
    beforeEach(async () => {
      savedObjectOriginalAttributes = {
        publicProperty: chance.string(),
        publicPropertyExcludedFromAAD: chance.string(),
        privateProperty: chance.string(),
      };

      const { body } = await supertest
        .post(`${getURLAPIBaseURL()}${SAVED_OBJECT_WITH_SECRET_TYPE}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: savedObjectOriginalAttributes }, {})
        .expect(200);

      savedObject = body;
    });

    it('#create encrypts attributes and strips them from response', async () => {
      expect(savedObject.attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
      });

      const rawAttributes = await getRawSavedObjectAttributes(savedObject.id);
      expect(rawAttributes.publicProperty).to.be(savedObjectOriginalAttributes.publicProperty);
      expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
        savedObjectOriginalAttributes.publicPropertyExcludedFromAAD
      );

      expect(rawAttributes.privateProperty).to.not.be.empty();
      expect(rawAttributes.privateProperty).to.not.be(
        savedObjectOriginalAttributes.privateProperty
      );
    });

    it('#bulkCreate encrypts attributes and strips them from response', async () => {
      const bulkCreateParams = [
        {
          type: SAVED_OBJECT_WITH_SECRET_TYPE,
          attributes: {
            publicProperty: chance.string(),
            publicPropertyExcludedFromAAD: chance.string(),
            privateProperty: chance.string(),
          },
        },
        {
          type: SAVED_OBJECT_WITH_SECRET_TYPE,
          attributes: {
            publicProperty: chance.string(),
            publicPropertyExcludedFromAAD: chance.string(),
            privateProperty: chance.string(),
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
        const rawAttributes = await getRawSavedObjectAttributes(savedObjects[index].id);

        expect(attributesFromResponse).to.eql({
          publicProperty: attributesFromRequest.publicProperty,
          publicPropertyExcludedFromAAD: attributesFromRequest.publicPropertyExcludedFromAAD,
        });

        expect(rawAttributes.publicProperty).to.be(attributesFromRequest.publicProperty);
        expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
          attributesFromRequest.publicPropertyExcludedFromAAD
        );
        expect(rawAttributes.privateProperty).to.not.be.empty();
        expect(rawAttributes.privateProperty).to.not.be(attributesFromRequest.privateProperty);
      }
    });

    it('#get strips encrypted attributes from response', async () => {
      const { body: response } = await supertest
        .get(`${getURLAPIBaseURL()}${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
      });
    });

    it('#find strips encrypted attributes from response', async () => {
      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .get(`${getURLAPIBaseURL()}_find?type=${SAVED_OBJECT_WITH_SECRET_TYPE}`)
        .expect(200);

      expect(savedObjects).to.have.length(1);
      expect(savedObjects[0].id).to.be(savedObject.id);
      expect(savedObjects[0].attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
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
      });
    });

    it('#update encrypts attributes and strips them from response', async () => {
      const updatedAttributes = {
        publicProperty: chance.string(),
        publicPropertyExcludedFromAAD: chance.string(),
        privateProperty: chance.string(),
      };

      const { body: response } = await supertest
        .put(`${getURLAPIBaseURL()}${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: updatedAttributes }, {})
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: updatedAttributes.publicProperty,
        publicPropertyExcludedFromAAD: updatedAttributes.publicPropertyExcludedFromAAD,
      });

      const rawAttributes = await getRawSavedObjectAttributes(savedObject.id);
      expect(rawAttributes.publicProperty).to.be(updatedAttributes.publicProperty);
      expect(rawAttributes.publicPropertyExcludedFromAAD).to.be(
        updatedAttributes.publicPropertyExcludedFromAAD
      );

      expect(rawAttributes.privateProperty).to.not.be.empty();
      expect(rawAttributes.privateProperty).to.not.be(updatedAttributes.privateProperty);
    });

    it('#getDecryptedAsInternalUser decrypts and returns all attributes', async () => {
      const { body: decryptedResponse } = await supertest
        .get(`${getURLAPIBaseURL()}get-decrypted-as-internal-user/${savedObject.id}`)
        .expect(200);

      expect(decryptedResponse.attributes).to.eql(savedObjectOriginalAttributes);
    });

    it('#getDecryptedAsInternalUser is able to decrypt if non-AAD attribute has changed', async () => {
      const updatedAttributes = { publicPropertyExcludedFromAAD: chance.string() };

      const { body: response } = await supertest
        .put(`${getURLAPIBaseURL()}${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: updatedAttributes }, {})
        .expect(200);

      expect(response.attributes).to.eql({
        publicPropertyExcludedFromAAD: updatedAttributes.publicPropertyExcludedFromAAD,
      });

      const { body: decryptedResponse } = await supertest
        .get(`${getURLAPIBaseURL()}get-decrypted-as-internal-user/${savedObject.id}`)
        .expect(200);

      expect(decryptedResponse.attributes).to.eql({
        ...savedObjectOriginalAttributes,
        publicPropertyExcludedFromAAD: updatedAttributes.publicPropertyExcludedFromAAD,
      });
    });

    it('#getDecryptedAsInternalUser fails to decrypt if AAD attribute has changed', async () => {
      const updatedAttributes = { publicProperty: chance.string() };

      const { body: response } = await supertest
        .put(`${getURLAPIBaseURL()}${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: updatedAttributes }, {})
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: updatedAttributes.publicProperty,
      });

      // Bad request means that we successfully detected "EncryptionError" (not unexpected one).
      await supertest
        .get(`${getURLAPIBaseURL()}get-decrypted-as-internal-user/${savedObject.id}`)
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Failed to encrypt attributes',
        });
    });
  }

  describe('encrypted saved objects API', () => {
    afterEach(async () => {
      await es.deleteByQuery({
        index: '.kibana',
        q: `type:${SAVED_OBJECT_WITH_SECRET_TYPE}`,
        refresh: true,
      });
    });

    describe('within a default space', () => {
      runTests(() => '/api/saved_objects/', id => `${SAVED_OBJECT_WITH_SECRET_TYPE}:${id}`);
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
        await supertest
          .delete(`/api/spaces/space/${SPACE_ID}`)
          .set('kbn-xsrf', 'xxx')
          .expect(204);
      });

      runTests(
        () => `/s/${SPACE_ID}/api/saved_objects/`,
        id => `${SPACE_ID}:${SAVED_OBJECT_WITH_SECRET_TYPE}:${id}`
      );
    });
  });
}
