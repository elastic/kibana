/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_START_TIME = '2015-09-19T06:31:44.000';
const TEST_END_TIME = '2015-09-23T18:31:44.000';
const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

const fieldsNotInPattern = [
  { name: 'geo', type: 'object' },
  { name: 'id', type: 'string' },
  { name: 'machine', type: 'object' },
];

const fieldsNotInDocuments = [
  { name: 'meta', type: 'object' },
  { name: 'meta.char', type: 'string' },
  { name: 'meta.related', type: 'string' },
  { name: 'meta.user', type: 'object' },
  { name: 'meta.user.firstname', type: 'string' },
  { name: 'meta.user.lastname', type: 'string' },
];

const fieldsWithData = [
  { name: '@message', type: 'string' },
  { name: '@message.raw', type: 'string' },
  { name: '@tags', type: 'string' },
  { name: '@tags.raw', type: 'string' },
  { name: '@timestamp', type: 'date' },
  { name: 'agent', type: 'string' },
  { name: 'agent.raw', type: 'string' },
  { name: 'bytes', type: 'number' },
  { name: 'clientip', type: 'ip' },
  { name: 'extension', type: 'string' },
  { name: 'extension.raw', type: 'string' },
  { name: 'geo.coordinates', type: 'geo_point' },
  { name: 'geo.dest', type: 'string' },
  { name: 'geo.src', type: 'string' },
  { name: 'geo.srcdest', type: 'string' },
  { name: 'headings', type: 'string' },
  { name: 'headings.raw', type: 'string' },
  { name: 'host', type: 'string' },
  { name: 'host.raw', type: 'string' },
  { name: 'index', type: 'string' },
  { name: 'index.raw', type: 'string' },
  { name: 'ip', type: 'ip' },
  { name: 'links', type: 'string' },
  { name: 'links.raw', type: 'string' },
  { name: 'machine.os', type: 'string' },
  { name: 'machine.os.raw', type: 'string' },
  { name: 'machine.ram', type: 'string' },
  { name: 'memory', type: 'string' },
  { name: 'phpmemory', type: 'string' },
  { name: 'referer', type: 'string' },
  { name: 'request', type: 'string' },
  { name: 'request.raw', type: 'string' },
  { name: 'response', type: 'string' },
  { name: 'response.raw', type: 'string' },
  { name: 'spaces', type: 'string' },
  { name: 'spaces.raw', type: 'string' },
  { name: 'type', type: 'string' },
  { name: 'url', type: 'string' },
  { name: 'url.raw', type: 'string' },
  { name: 'utc_time', type: 'string' },
  { name: 'xss', type: 'string' },
  { name: 'xss.raw', type: 'string' },
];

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('index stats apis', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('visualize/default');
    });
    after(async () => {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('visualize/default');
    });

    describe('existence', () => {
      it('should find which fields exist in the sample documents', async () => {
        const { body } = await supertest
          .post('/api/lens/index_stats/logstash-2015.09.22')
          .set(COMMON_HEADERS)
          .send({
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            size: 500,
            fields: fieldsWithData.concat(fieldsNotInDocuments, fieldsNotInPattern),
          })
          .expect(200);

        expect(Object.keys(body)).to.eql(fieldsWithData.map(field => field.name));
      });

      it('should throw a 404 for a non-existent index', async () => {
        await supertest
          .post('/api/lens/index_stats/fake')
          .set(COMMON_HEADERS)
          .send({
            fromDate: TEST_START_TIME,
            toDate: TEST_END_TIME,
            timeFieldName: '@timestamp',
            size: 500,
            fields: [],
          })
          .expect(404);
      });
    });
  });
};
