/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { ESTestIndexTool, ES_TEST_INDEX_NAME, getUrlPrefix } from '../../../../../common/lib';
import { createEsDocuments } from './create_test_data';

const API_URI = 'api/alerting_builtins/index_threshold/_indices';

// eslint-disable-next-line import/no-default-export
export default function indicesEndpointTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('legacyEs');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('indices endpoint', () => {
    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await createEsDocuments(es, esTestIndexTool);
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    it('should return the test index', async () => {
      const query = { pattern: ES_TEST_INDEX_NAME };

      const result = await runQueryExpect(query, 200);
      expect(result.indices).to.eql([ES_TEST_INDEX_NAME]);
    });

    it('should return errors when expected', async () => {
      expect(await runQueryExpect(null, 400)).to.eql(
        bodyWithMessage('[request body]: expected a plain object value, but found [null] instead.')
      );
      expect(await runQueryExpect({}, 400)).to.eql(
        bodyWithMessage(
          '[request body.pattern]: expected value of type [string] but got [undefined]'
        )
      );
      expect(await runQueryExpect({ pattern: null }, 400)).to.eql(
        bodyWithMessage('[request body.pattern]: expected value of type [string] but got [null]')
      );
      expect(await runQueryExpect({ pattern: 1 }, 400)).to.eql(
        bodyWithMessage('[request body.pattern]: expected value of type [string] but got [number]')
      );

      function bodyWithMessage(message: string): any {
        return {
          error: 'Bad Request',
          message,
          statusCode: 400,
        };
      }
    });

    it('should return an empty array for empty input', async () => {
      const result = await runQueryExpect({ pattern: '' }, 200);
      expect(result.indices).to.be.an('array');
      expect(result.indices.length).to.be(0);
    });

    it('should handle indices that do not exist', async () => {
      const NON_EXISTANT_INDEX_NAME = 'non-existent-index-name-foo';
      const exactResult = await runQueryExpect({ pattern: ES_TEST_INDEX_NAME }, 200);
      expect(exactResult.indices).to.be.an('array');
      expect(exactResult.indices.length).to.be(1);

      let pattern = NON_EXISTANT_INDEX_NAME;
      let testResult = await runQueryExpect({ pattern }, 200);
      expect(testResult.indices.length).to.be(0);

      pattern = `${ES_TEST_INDEX_NAME},${NON_EXISTANT_INDEX_NAME}`;
      testResult = await runQueryExpect({ pattern }, 200);
      expect(testResult).to.eql(exactResult);

      pattern = `${NON_EXISTANT_INDEX_NAME},${ES_TEST_INDEX_NAME}`;
      testResult = await runQueryExpect({ pattern }, 200);
      expect(testResult).to.eql(exactResult);
    });

    it('should handle wildcards', async () => {
      const exactResult = await runQueryExpect({ pattern: ES_TEST_INDEX_NAME }, 200);

      let pattern = `*${ES_TEST_INDEX_NAME}`;
      let testResult = await runQueryExpect({ pattern }, 200);
      expect(testResult).to.eql(exactResult);

      pattern = `${ES_TEST_INDEX_NAME}*`;
      testResult = await runQueryExpect({ pattern }, 200);
      expect(testResult).to.eql(exactResult);
    });

    it('should handle aliases', async () => {
      const result = await runQueryExpect({ pattern: '.kibana' }, 200);
      expect(result.indices).to.be.an('array');
      expect(result.indices.includes('.kibana')).to.be(true);
    });

    // TODO: the pattern '*a:b,c:d*' throws an exception in dev, but not ci!
    it('should handle no_such_remote_cluster', async () => {
      const result = await runQueryExpect({ pattern: '*a:b,c:d*' }, 200);
      expect(result.indices.length).to.be(0);
    });
  });

  async function runQueryExpect(requestBody: any, status: number): Promise<any> {
    const url = `${getUrlPrefix(Spaces.space1.id)}/${API_URI}`;
    const res = await supertest.post(url).set('kbn-xsrf', 'foo').send(requestBody);

    if (res.status !== status) {
      // good place to put a console log for debugging unexpected results
      // console.log(res.body)
      throw new Error(`expected status ${status}, but got ${res.status}`);
    }

    return res.body;
  }
}
