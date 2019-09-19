/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { JOB_PARAMS_IN_POSTBODY, JOB_PARAMS_IN_QUERYSTRING } from './fixtures';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: { getService: any }) {
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');
  const generateAPI = {
    getCsvFromParamsInPayload: async (jobParams: object = {}) => {
      return await supertestSvc
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send(jobParams);
    },
    getCsvFromParamsInQueryString: async (jobParams: string = '') => {
      return await supertestSvc
        .post(`/api/reporting/generate/csv?jobParams=${jobParams}`)
        .set('kbn-xsrf', 'xxx');
    },
  };

  describe('Generation from Job Params', () => {
    it('Rejects bogus jobParams', async () => {
      await esArchiver.load('reporting/logs');
      await esArchiver.load('logstash_functional');

      const { status: resStatus, text: resText } = (await generateAPI.getCsvFromParamsInPayload({
        jobParams: 0,
      })) as supertest.Response;

      expect(resStatus).to.eql(400);
      expect(resText).to.match(/\\\"jobParams\\\" must be a string/);

      await esArchiver.unload('reporting/logs');
      await esArchiver.unload('logstash_functional');
    });

    it('Rejects empty jobParams', async () => {
      await esArchiver.load('reporting/logs');
      await esArchiver.load('logstash_functional');

      const {
        status: resStatus,
        text: resText,
      } = (await generateAPI.getCsvFromParamsInPayload()) as supertest.Response;

      expect(resStatus).to.eql(400);
      expect(resText).to.match(/jobParams RISON string is required/);

      await esArchiver.unload('reporting/logs');
      await esArchiver.unload('logstash_functional');
    });

    it('Accepts jobParams in POST payload', async () => {
      await esArchiver.load('reporting/logs');
      await esArchiver.load('logstash_functional');

      const { status: resStatus, text: resText } = (await generateAPI.getCsvFromParamsInPayload({
        jobParams: JOB_PARAMS_IN_POSTBODY,
      })) as supertest.Response;
      expect(resStatus).to.eql(200);
      expect(resText).to.match(/"jobtype":"csv"/);

      await esArchiver.unload('reporting/logs');
      await esArchiver.unload('logstash_functional');
    });

    it('Accepts jobParams in query string', async () => {
      await esArchiver.load('reporting/logs');
      await esArchiver.load('logstash_functional');

      const { status: resStatus, text: resText } = (await generateAPI.getCsvFromParamsInQueryString(
        JOB_PARAMS_IN_QUERYSTRING
      )) as supertest.Response;
      expect(resStatus).to.eql(200);
      expect(resText).to.match(/"jobtype":"csv"/);

      await esArchiver.unload('reporting/logs');
      await esArchiver.unload('logstash_functional');
    });
  });
}
