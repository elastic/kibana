/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('/api/console/autocomplete_entities', () => {
    it('should return an object with properties of "mappings", "aliases", "dataStreams", "legacyTemplates", "indexTemplates", "componentTemplates"', async () => {
      const expectedFields = [
        'mappings',
        'aliases',
        'dataStreams',
        'legacyTemplates',
        'indexTemplates',
        'componentTemplates',
      ];
      const { body } = await supertest
        .get('/api/console/autocomplete_entities')
        .query({
          indices: true,
          fields: true,
          templates: true,
          dataStreams: true,
        })
        .expect(200);
      expect(Object.keys(body).sort()).to.eql(expectedFields.sort());
    });

    describe('with template settings set to false', () => {
      it('should return empty templates', async () => {
        const { body } = await supertest
          .get('/api/console/autocomplete_entities')
          .query({
            indices: true,
            fields: true,
            templates: false,
            dataStreams: true,
          })
          .expect(200);

        expect(body.legacyTemplates).to.eql({});
        expect(body.indexTemplates).to.eql({});
        expect(body.componentTemplates).to.eql({});
      });
    });
  });
};
