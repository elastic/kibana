/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `fq_datafeed_preview_${Date.now()}`;

  const job = {
    job_id: `${jobId}_1`,
    description: '',
    groups: ['automated', 'farequote'],
    analysis_config: {
      bucket_span: '30m',
      detectors: [{ function: 'distinct_count', field_name: 'airline' }],
      influencers: [],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '11MB' },
  };

  function isUpperCase(str: string) {
    return /^[A-Z]+$/.test(str);
  }

  function isLowerCase(str: string) {
    return /^[a-z]+$/.test(str);
  }

  describe('Datafeed preview', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it(`should return a normal datafeed preview`, async () => {
      const datafeed = {
        datafeed_id: '',
        job_id: '',
        indices: ['ft_farequote'],
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
          },
        },
        runtime_mappings: {},
      };

      const { body } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed })
        .expect(200);

      expect(body.hits.total.value).to.eql(3207);
      expect(Array.isArray(body.hits?.hits[0]?.fields?.airline)).to.eql(true);

      const airlines: string[] = body.hits.hits.map((a: any) => a.fields.airline[0]);
      expect(airlines.length).to.not.eql(0);
      expect(airlines.every((a) => isUpperCase(a))).to.eql(true);
    });

    it(`should return a datafeed preview using custom query`, async () => {
      const datafeed = {
        datafeed_id: '',
        job_id: '',
        indices: ['ft_farequote'],
        query: {
          bool: {
            should: [
              {
                match: {
                  airline: 'AAL',
                },
              },
            ],
          },
        },
        runtime_mappings: {},
      };

      const { body } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed })
        .expect(200);

      expect(body.hits.total.value).to.eql(300);
      expect(Array.isArray(body.hits?.hits[0]?.fields?.airline)).to.eql(true);

      const airlines: string[] = body.hits.hits.map((a: any) => a.fields.airline[0]);
      expect(airlines.length).to.not.eql(0);
      expect(airlines.every((a) => a === 'AAL')).to.eql(true);
    });

    it(`should return a datafeed preview using runtime mappings`, async () => {
      const datafeed = {
        datafeed_id: '',
        job_id: '',
        indices: ['ft_farequote'],
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
          },
        },
        runtime_mappings: {
          lowercase_airline: {
            type: 'keyword',
            script: {
              source: 'emit(params._source.airline.toLowerCase())',
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed })
        .expect(200);

      expect(body.hits.total.value).to.eql(3207);
      expect(Array.isArray(body.hits?.hits[0]?.fields?.lowercase_airline)).to.eql(true);

      const airlines: string[] = body.hits.hits.map((a: any) => a.fields.lowercase_airline[0]);
      expect(airlines.length).to.not.eql(0);
      expect(isLowerCase(airlines[0])).to.eql(true);
    });

    it(`should return a datafeed preview using custom query and runtime mappings which override the field name`, async () => {
      const datafeed = {
        datafeed_id: '',
        job_id: '',
        indices: ['ft_farequote'],
        query: {
          bool: {
            should: [
              {
                match: {
                  airline: 'aal',
                },
              },
            ],
          },
        },
        runtime_mappings: {
          // override the airline field name
          airline: {
            type: 'keyword',
            script: {
              source: 'emit(params._source.airline.toLowerCase())',
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed })
        .expect(200);

      expect(body.hits.total.value).to.eql(300);
      expect(Array.isArray(body.hits?.hits[0]?.fields?.airline)).to.eql(true);

      const airlines: string[] = body.hits.hits.map((a: any) => a.fields.airline[0]);
      expect(airlines.length).to.not.eql(0);
      expect(isLowerCase(airlines[0])).to.eql(true);
    });
  });
};
