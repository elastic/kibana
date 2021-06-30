/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick } from 'lodash';
import {
  ReportApiJSON,
  ReportDocument,
  ReportSource,
} from '../../../plugins/reporting/common/types';
import { FtrProviderContext } from '../ftr_provider_context';

const apiResponseFields = [
  'attempts',
  'created_by',
  'jobtype',
  'max_attempts',
  'meta',
  'payload.isDeprecated',
  'payload.title',
  'payload.type',
  'status',
];

// TODO: clean up the /list and /info endpoints to return ReportApiJSON interface data
const documentResponseFields = [
  '_source.attempts',
  '_source.created_by',
  '_source.jobtype',
  '_source.max_attempts',
  '_source.meta',
  '_source.payload.isDeprecated',
  '_source.payload.title',
  '_source.payload.type',
  '_source.status',
];

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestNoAuth = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');

  const postJobCSV = async () => {
    const jobParams =
      `(browserTimezone:UTC,columns:!('@timestamp',clientip,extension),` +
      `objectType:search,searchSource:(fields:!((field:'*',include_unmapped:true)),filter:!((meta:(index:'logstash-*',params:()),` +
      `range:('@timestamp':(format:strict_date_optional_time,gte:'2006-06-21T22:00:57.631Z',lte:'2021-06-21T22:00:57.631Z')))),` +
      `index:'logstash-*',parent:(filter:!(('$state':(store:appState),meta:(alias:datefilter🥜,disabled:!f,index:'logstash-*',` +
      `key:'@timestamp',negate:!f,params:(gte:'2015-09-20T10:19:40.307Z',lt:'2015-09-20T10:26:56.221Z'),type:range),` +
      `range:('@timestamp':(gte:'2015-09-20T10:19:40.307Z',lt:'2015-09-20T10:26:56.221Z')))),highlightAll:!t,index:'logstash-*',` +
      `query:(language:kuery,query:''),version:!t),sort:!(('@timestamp':desc)),trackTotalHits:!t,version:!t),title:'A Saved Search With a DATE FILTER')`;
    const { status: resStatus, text: resText } = await supertestNoAuth
      .post(`/api/reporting/generate/csv_searchsource?jobParams=${encodeURI(jobParams)}`)
      .set('kbn-xsrf', 'xxx');
    expect(resStatus).to.be(200);

    const result: { job: ReportApiJSON; path: string } = JSON.parse(resText);
    expect(result.job.payload.isDeprecated).to.not.be(true);

    return result;
  };

  describe('Job Listing APIs', () => {
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
      const { job, path }: { job: ReportApiJSON; path: string } = await postJobCSV();
      expectSnapshot(pick(job, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv_searchsource",
          "max_attempts": 1,
          "meta": Object {
            "objectType": "search",
          },
          "payload": Object {
            "title": "A Saved Search With a DATE FILTER",
          },
          "status": "pending",
        }
      `);

      // call the job count api
      const { text: countText } = await supertestNoAuth
        .get(`/api/reporting/jobs/count`)
        .set('kbn-xsrf', 'xxx');
      expect(countText).to.be('1');

      // clean up
      await reportingAPI.waitForJobToFinish(path);
    });

    it('Posted CSV job is visible in the status check', async () => {
      // post a job
      const { job, path }: { job: ReportApiJSON; path: string } = await postJobCSV();
      expectSnapshot(pick(job, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv_searchsource",
          "max_attempts": 1,
          "meta": Object {
            "objectType": "search",
          },
          "payload": Object {
            "title": "A Saved Search With a DATE FILTER",
          },
          "status": "pending",
        }
      `);

      // call the listing api
      const { text: listText } = await supertestNoAuth
        .get(`/api/reporting/jobs/list?page=0&ids=${job.id}`)
        .set('kbn-xsrf', 'xxx');

      // verify the top item in the list
      const listingJobs: ReportDocument[] = JSON.parse(listText);
      expect(listingJobs[0]._id).to.be(job.id);
      expectSnapshot(listingJobs.map((j) => pick(j, documentResponseFields))).toMatchInline(`
        Array [
          Object {
            "_source": Object {
              "attempts": 0,
              "created_by": false,
              "jobtype": "csv_searchsource",
              "max_attempts": 1,
              "meta": Object {
                "objectType": "search",
              },
              "payload": Object {
                "title": "A Saved Search With a DATE FILTER",
              },
              "status": "pending",
            },
          },
        ]
      `);

      // clean up
      await reportingAPI.waitForJobToFinish(path);
    });

    it('Posted CSV job is visible in the first page of jobs listing', async () => {
      // post a job
      const { job, path }: { job: ReportApiJSON; path: string } = await postJobCSV();
      expectSnapshot(pick(job, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv_searchsource",
          "max_attempts": 1,
          "meta": Object {
            "objectType": "search",
          },
          "payload": Object {
            "title": "A Saved Search With a DATE FILTER",
          },
          "status": "pending",
        }
      `);

      // call the listing api
      const { text: listText } = await supertestNoAuth
        .get(`/api/reporting/jobs/list?page=0`)
        .set('kbn-xsrf', 'xxx');

      // verify the top item in the list
      const listingJobs: ReportDocument[] = JSON.parse(listText);
      expect(listingJobs[0]._id).to.be(job.id);
      expectSnapshot(listingJobs.map((j) => pick(j, documentResponseFields))).toMatchInline(`
        Array [
          Object {
            "_source": Object {
              "attempts": 0,
              "created_by": false,
              "jobtype": "csv_searchsource",
              "max_attempts": 1,
              "meta": Object {
                "objectType": "search",
              },
              "payload": Object {
                "title": "A Saved Search With a DATE FILTER",
              },
              "status": "pending",
            },
          },
        ]
      `);

      // clean up
      await reportingAPI.waitForJobToFinish(path);
    });

    it('Posted CSV job details are visible in the info API', async () => {
      // post a job
      const { job, path }: { job: ReportApiJSON; path: string } = await postJobCSV();
      expectSnapshot(pick(job, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv_searchsource",
          "max_attempts": 1,
          "meta": Object {
            "objectType": "search",
          },
          "payload": Object {
            "title": "A Saved Search With a DATE FILTER",
          },
          "status": "pending",
        }
      `);

      const { text: infoText } = await supertestNoAuth
        .get(`/api/reporting/jobs/info/${job.id}`)
        .set('kbn-xsrf', 'xxx');

      const info: ReportSource = JSON.parse(infoText);
      expectSnapshot(pick(info, apiResponseFields)).toMatchInline(`
        Object {
          "attempts": 0,
          "created_by": false,
          "jobtype": "csv_searchsource",
          "max_attempts": 1,
          "meta": Object {
            "objectType": "search",
          },
          "payload": Object {
            "title": "A Saved Search With a DATE FILTER",
          },
          "status": "pending",
        }
      `);

      await reportingAPI.waitForJobToFinish(path);
    });
  });
}
