/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// from: x-pack/test/alerting_api_integration/common/config.ts
const ACTION_ID = 'preconfigured-es-index-action';
const ES_TEST_INDEX_NAME = 'functional-test-actions-index-preconfigured';

// eslint-disable-next-line import/no-default-export
export default function indexTest({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');

  describe('preconfigured index action', () => {
    beforeEach(() => clearTestIndex(es));

    it('should execute successfully when expected for a single body', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/action/${ACTION_ID}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ testing: [4, 5, 6] }],
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      const items = await getTestIndexItems(es);
      expect(items.length).to.eql(1);

      // check document sans timestamp
      const document = items[0]._source;
      const timestamp = document.timestamp;
      delete document.timestamp;
      expect(document).to.eql({ testing: [4, 5, 6] });

      // check timestamp
      const timestampTime = new Date(timestamp).getTime();
      const timeNow = Date.now();
      const timeMinuteAgo = timeNow - 1000 * 60;
      expect(timestampTime).to.be.within(timeMinuteAgo, timeNow);
    });
  });
}

async function clearTestIndex(es: any) {
  return await es.indices.delete({
    index: ES_TEST_INDEX_NAME,
    ignoreUnavailable: true,
  });
}

async function getTestIndexItems(es: any) {
  const result = await es.search({
    index: ES_TEST_INDEX_NAME,
  });

  return result.hits.hits;
}
