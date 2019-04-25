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

  async function getRawSavedObjectAttributes(id: string) {
    const {
      _source: { [SAVED_OBJECT_WITH_SECRET_TYPE]: savedObject },
    } = await es.get({
      id: `${SAVED_OBJECT_WITH_SECRET_TYPE}:${id}`,
      type: '_doc',
      index: '.kibana',
    });

    return savedObject;
  }

  describe('within a default space', () => {
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
        .post(`/api/saved_objects/${SAVED_OBJECT_WITH_SECRET_TYPE}`)
        .set('kbn-xsrf', 'xxx')
        .send({ attributes: savedObjectOriginalAttributes }, {})
        .expect(200);

      savedObject = body;
    });

    afterEach(async () => {
      await supertest
        .delete(`/api/saved_objects/${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
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

    it('#get strips encrypted attributes from response', async () => {
      const { body: response } = await supertest
        .get(`/api/saved_objects/${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
        .expect(200);

      expect(response.attributes).to.eql({
        publicProperty: savedObjectOriginalAttributes.publicProperty,
        publicPropertyExcludedFromAAD: savedObjectOriginalAttributes.publicPropertyExcludedFromAAD,
      });
    });

    it('#find strips encrypted attributes from response', async () => {
      const { body: response } = await supertest
        .get(`/api/saved_objects/_find?type=${SAVED_OBJECT_WITH_SECRET_TYPE}`)
        .expect(200);

      expect(response.saved_objects).to.have.length(1);
      expect(response.saved_objects[0].id).to.be(savedObject.id);
      expect(response.saved_objects[0].attributes).to.eql({
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
        .put(`/api/saved_objects/${SAVED_OBJECT_WITH_SECRET_TYPE}/${savedObject.id}`)
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
        .get(`/api/eso/v1/get-decrypted-as-internal-user/${savedObject.id}`)
        .expect(200);

      expect(decryptedResponse.attributes).to.eql(savedObjectOriginalAttributes);
    });
  });
}
