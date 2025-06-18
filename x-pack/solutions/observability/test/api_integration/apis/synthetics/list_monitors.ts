/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('ListMonitorsAPI', function () {
    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    const common = {
      type: 'http',
      url: 'https://www.elastic.co',
    };

    const FIRST_TAG = 'a';
    const SECOND_TAG = 'b';

    const FIRST_LOCATION = 'dev';
    const SECOND_LOCATION = 'dev2';

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      // Create test monitors with different tags
      const monitorA = {
        ...common,
        name: 'Monitor A',
        tags: [FIRST_TAG, SECOND_TAG],
        locations: [FIRST_LOCATION, SECOND_LOCATION],
      };

      const monitorB = {
        ...common,
        name: 'Monitor B',
        url: 'https://www.elastic.co',
        tags: [SECOND_TAG],
        locations: [FIRST_LOCATION],
      };

      // Create the test monitors
      await supertestAPI
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitorA);

      await supertestAPI
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitorB);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('useLogicalAndFor parameter', () => {
      it('should return 2 monitors when not using the useLogicalAndFor query parameter and searching for both tags', async () => {
        const response = await supertestAPI
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({ tags: [FIRST_TAG, SECOND_TAG] })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.monitors.length).to.be(2);
      });

      it('should return only 1 monitor when useLogicalAndFor includes tags and searching for both tags', async () => {
        const response = await supertestAPI
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            tags: [FIRST_TAG, SECOND_TAG],
            useLogicalAndFor: ['tags'],
          })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.monitors.length).to.be(1);
      });
      it('should return 2 monitors when not using the useLogicalAndFor query parameter and searching for both locations', async () => {
        const response = await supertestAPI
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({ locations: [FIRST_LOCATION, SECOND_LOCATION] })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.monitors.length).to.be(2);
      });

      it('should return only 1 monitor when useLogicalAndFor includes tags and searching for both locations', async () => {
        const response = await supertestAPI
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            locations: [FIRST_LOCATION, SECOND_LOCATION],
            useLogicalAndFor: ['locations'],
          })
          .set('kbn-xsrf', 'true');

        expect(response.status).to.be(200);
        expect(response.body.monitors.length).to.be(1);
      });
    });
  });
}
