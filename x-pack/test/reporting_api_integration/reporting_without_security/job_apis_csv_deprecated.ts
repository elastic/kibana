/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick } from 'lodash';
import { ReportApiJSON } from '../../../plugins/reporting/common/types';
import { FtrProviderContext } from '../ftr_provider_context';
import { JOB_PARAMS_RISON_CSV_DEPRECATED } from '../services/fixtures';

const apiResponseFields = [
  'attempts',
  'created_by',
  'jobtype',
  'meta',
  'payload.isDeprecated',
  'payload.title',
  'payload.type',
  'status',
];

const parseApiJSON = (apiResponseText: string): { job: ReportApiJSON; path: string } =>
  JSON.parse(apiResponseText);

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestNoAuth = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');

  describe('Job Listing APIs: Deprecated CSV Export', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/logs');
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
    });

    it('Posted CSV job is visible in the job count', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });
      expect(resStatus).to.be(200);

      const { job, path } = parseApiJSON(resText);
      expectSnapshot(pick(job, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv",
          "meta": Object {
            "isDeprecated": true,
          },
          "payload": Object {
            "isDeprecated": true,
            "title": "A Saved Search With a DATE FILTER",
            "type": "search",
          },
          "status": "pending",
        }
      `);

      // call the job count api
      const { text: countText } = await supertestNoAuth
        .get(`/api/reporting/jobs/count`)
        .set('kbn-xsrf', 'xxx');

      const countResult = JSON.parse(countText);
      expect(countResult).to.be(1);

      await reportingAPI.waitForJobToFinish(path);
    });

    it('Posted CSV job is visible in the status check', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });
      expect(resStatus).to.be(200);

      const { job, path } = parseApiJSON(resText);
      // call the single job listing api (status check)
      const { text: listText } = await supertestNoAuth
        .get(`/api/reporting/jobs/list?page=0&ids=${job.id}`)
        .set('kbn-xsrf', 'xxx');

      const listingJobs: ReportApiJSON[] = JSON.parse(listText);
      expect(listingJobs[0].id).to.be(job.id);
      expectSnapshot(listingJobs.map((j) => pick(j, apiResponseFields))).toMatchInline(`
        Array [
          Object {
            "attempts": 0,
            "created_by": false,
            "jobtype": "csv",
            "meta": Object {
              "isDeprecated": true,
            },
            "payload": Object {
              "isDeprecated": true,
              "title": "A Saved Search With a DATE FILTER",
              "type": "search",
            },
            "status": "pending",
          },
        ]
      `);

      await reportingAPI.waitForJobToFinish(path);
    });

    it('Posted CSV job is visible in the first page of jobs listing', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });
      expect(resStatus).to.be(200);

      const { job, path } = parseApiJSON(resText);
      // call the ALL job listing api
      const { text: listText } = await supertestNoAuth
        .get(`/api/reporting/jobs/list?page=0`)
        .set('kbn-xsrf', 'xxx');

      const listingJobs: ReportApiJSON[] = JSON.parse(listText);
      expect(listingJobs[0].id).to.eql(job.id);
      expectSnapshot(listingJobs.map((j) => pick(j, apiResponseFields))).toMatchInline(`
        Array [
          Object {
            "attempts": 0,
            "created_by": false,
            "jobtype": "csv",
            "meta": Object {
              "isDeprecated": true,
            },
            "payload": Object {
              "isDeprecated": true,
              "title": "A Saved Search With a DATE FILTER",
              "type": "search",
            },
            "status": "pending",
          },
        ]
      `);

      await reportingAPI.waitForJobToFinish(path);
    });

    it('Posted CSV job details are visible in the info API', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });
      expect(resStatus).to.be(200);

      const { job, path } = parseApiJSON(resText);
      const { text: infoText } = await supertestNoAuth
        .get(`/api/reporting/jobs/info/${job.id}`)
        .set('kbn-xsrf', 'xxx');

      const info = JSON.parse(infoText);
      expectSnapshot(pick(info, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv",
          "meta": Object {
            "isDeprecated": true,
          },
          "payload": Object {
            "isDeprecated": true,
            "title": "A Saved Search With a DATE FILTER",
            "type": "search",
          },
          "status": "pending",
        }
      `);

      await reportingAPI.waitForJobToFinish(path);
    });
  });
}
