/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Client, SearchParams } from 'elasticsearch';

import { FtrProviderContext } from '../../ftr_provider_context';

// const TEST_START_TIME = '2015-09-19T06:31:44.000';
// const TEST_END_TIME = '2015-09-23T18:31:44.000';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es: Client = getService('es');

  describe('lens telemetry', () => {
    afterEach(() => {
      es.deleteByQuery({
        index: '.kibana',
        q: 'type:lens-ui-telemetry',
      });
    });

    it('should do nothing on empty post', () => {
      await supertest
        .post('/api/lens/telemetry')
        .set(COMMON_HEADERS)
        .send({
          events: {},
          suggestionEvents: {},
        })
        .expect(200);

      const { count } = await es.count({
        index: '.kibana',
        q: 'type:lens-ui-telemetry',
      });

      expect(count).to.be(0);
    });

    it('should write a document per results', async () => {
      await supertest
        .post('/api/lens/telemetry')
        .set(COMMON_HEADERS)
        .send({
          events: {
            '2019-10-13': {
              loaded: 5,
              dragged: 2,
            },
            '2019-10-14': {
              loaded: 1,
            },
          },
          suggestionEvents: {
            '2019-11-01': {
              switched: 2,
            },
          },
        })
        .expect(200);

      const { count } = await es.count({
        index: '.kibana',
        q: 'type:lens-ui-telemetry',
      });

      expect(count).to.be(4);
    });
  });
};
