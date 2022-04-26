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
    return !/[A-Z]+/.test(str);
  }

  describe('Datafeed preview', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
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

      const { body, status } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1000, 'Response body total hits should be 1000');
      expect(typeof body[0]?.airline).to.eql('string', 'Response body airlines should be a string');

      const airlines: string[] = body.map((a: any) => a.airline);
      expect(airlines.length).to.not.eql(0, 'airlines length should not be 0');
      expect(airlines.every((a) => isUpperCase(a))).to.eql(
        true,
        'Response body airlines should all be upper case'
      );
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

      const { body, status } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1000, 'Response body total hits should be 1000');
      expect(typeof body[0]?.airline).to.eql('string', 'Response body airlines should be a string');

      const airlines: string[] = body.map((a: any) => a.airline);
      expect(airlines.length).to.not.eql(0, 'airlines length should not be 0');
      expect(airlines.every((a) => a === 'AAL')).to.eql(
        true,
        'Response body airlines should all be AAL'
      );
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

      const { body, status } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1000, 'Response body total hits should be 1000');
      expect(typeof body[0]?.airline).to.eql('string', 'Response body airlines should be a string');

      const airlines: string[] = body.map((a: any) => a.lowercase_airline);
      expect(airlines.length).to.not.eql(0, 'airlines length should not be 0');
      expect(isLowerCase(airlines[0])).to.eql(
        true,
        'Response body airlines should all be lower case'
      );
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

      const { body, status } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1000, 'Response body total hits should be 1000');
      expect(typeof body[0]?.airline).to.eql('string', 'Response body airlines should be a string');

      const airlines: string[] = body.map((a: any) => a.airline);
      expect(airlines.length).to.not.eql(0, 'airlines length should not be 0');
      expect(isLowerCase(airlines[0])).to.eql(
        true,
        'Response body airlines should all be lower case'
      );
    });

    it(`should return not a datafeed preview for ML viewer user`, async () => {
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

      const { body, status } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed });
      ml.api.assertResponseStatusCode(403, status, body);
    });

    it(`should return not a datafeed preview for unauthorized user`, async () => {
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

      const { body, status } = await supertest
        .post('/api/ml/jobs/datafeed_preview')
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job, datafeed });
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};
