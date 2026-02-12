/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('AddEditParams', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertest');
    const kServer = getService('kibanaServer');
    const testParam = {
      key: 'test',
      value: 'test',
    };

    before(async () => {
      await supertestAPI.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertestAPI
        .post('/api/fleet/epm/packages/synthetics/0.12.0')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    it('adds a test param', async () => {
      await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(200);

      const getResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponse.body.data[0].attributes).eql(testParam);
    });

    it('handles tags and description', async () => {
      const tagsAndDescription = {
        tags: ['a tag'],
        description: 'test description',
      };
      const testParam2 = {
        ...testParam,
        ...tagsAndDescription,
      };
      await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send(testParam2)
        .expect(200);

      const getResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponse.body.data[0].attributes).eql(testParam2);
    });

    it('handles editing a param', async () => {
      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(200);

      const getResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const param = getResponse.body.data[0];
      expect(param.attributes).eql(testParam);

      await supertestAPI
        .put(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ ...updatedParam, id: param.id })
        .expect(200);

      const updatedGetResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const updatedParamSO = updatedGetResponse.body.data[0];
      expect(updatedParamSO.attributes).eql(updatedParam);
    });

    it('handles spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertestAPI
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(200);

      const getResponse = await supertestAPI
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponse.body.data[0].namespaces).eql([SPACE_ID]);
      expect(getResponse.body.data[0].attributes).eql(testParam);
    });

    it('handles editing a param in spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertestAPI
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(200);

      const getResponse = await supertestAPI
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const param = getResponse.body.data[0];
      expect(param.attributes).eql(testParam);

      await supertestAPI
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send({ ...updatedParam, id: param.id })
        .expect(200);

      const updatedGetResponse = await supertestAPI
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const updatedParamSO = updatedGetResponse.body.data[0];
      expect(updatedParamSO.attributes).eql(updatedParam);
    });

    it('does not allow editing a param in created in one space in a different space', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const SPACE_ID_TWO = `test-space-${uuidv4()}-two`;
      const SPACE_NAME_TWO = `test-space-name ${uuidv4()} 2`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      await kServer.spaces.create({ id: SPACE_ID_TWO, name: SPACE_NAME_TWO });

      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertestAPI
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(200);

      const getResponse = await supertestAPI
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const param = getResponse.body.data[0];
      expect(param.attributes).eql(testParam);

      // space does exist so get request should be 200
      await supertestAPI
        .get(`/s/${SPACE_ID_TWO}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      await supertestAPI
        .put(`/s/${SPACE_ID_TWO}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send({ ...updatedParam, id: param.id })
        .expect(404);

      const updatedGetResponse = await supertestAPI
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const updatedParamSO = updatedGetResponse.body.data[0];
      expect(updatedParamSO.attributes).eql(testParam);
    });

    it('handles invalid spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertestAPI
        .post(`/s/doesnotexist${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(404);
    });

    it('handles editing with invalid spaces', async () => {
      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send(testParam)
        .expect(200);
      const getResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);
      const param = getResponse.body.data[0];
      expect(param.attributes).eql(testParam);

      await supertestAPI
        .put(`/s/doesnotexist${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send({ ...updatedParam, id: param.id })
        .expect(404);
    });

    it('handles share across spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertestAPI
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .send({ ...testParam, share_across_spaces: true })
        .expect(200);

      const getResponse = await supertestAPI
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponse.body.data[0].namespaces).eql(['*']);
      expect(getResponse.body.data[0].attributes).eql(testParam);
    });
  });
}
