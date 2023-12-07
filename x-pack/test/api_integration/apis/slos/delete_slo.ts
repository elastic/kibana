/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { CreateSLOInput } from '@kbn/slo-schema';
import { SO_SLO_TYPE } from '@kbn/observability-plugin/server/saved_objects';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('Delete SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    let _createSLOInput: CreateSLOInput;
    let createSLOInput: CreateSLOInput;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      _createSLOInput = getFixtureJson('create_slo');
    });

    beforeEach(() => {
      createSLOInput = _createSLOInput;
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
    });

    it('deletes new slo saved object and transforms', async () => {
      const request = createSLOInput;

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      const savedObject = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      expect(savedObject.saved_objects.length).eql(1);

      expect(savedObject.saved_objects[0].attributes.id).eql(id);

      const rollUpTransformResponse = await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // expect roll up transform to be created
      expect(rollUpTransformResponse.body.transforms[0].id).eql(`slo-${id}-1`);

      const summaryTransform = await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // expect summary transform to be created
      expect(summaryTransform.body.transforms[0].id).eql(`slo-summary-${id}-1`);

      await supertestAPI
        .delete(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(204);

      const savedObjectAfterDelete = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      // SO should now be deleted
      expect(savedObjectAfterDelete.saved_objects.length).eql(0);

      // roll up transform should be deleted
      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      // summary transform should be deleted
      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);
    });
  });
}
