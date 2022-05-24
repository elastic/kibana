/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

const farequoteMappings: estypes.MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    airline: {
      type: 'keyword',
    },
    responsetime: {
      type: 'float',
    },
  },
};

function getBaseJobConfig() {
  return {
    job_id: 'test',
    description: '',
    analysis_config: {
      bucket_span: '15m',
      detectors: [
        {
          function: 'mean',
          field_name: 'responsetime',
        },
      ],
      influencers: [],
    },
    analysis_limits: {
      model_memory_limit: '11MB',
    },
    data_description: {
      time_field: '@timestamp',
      time_format: 'epoch_ms',
    },
    model_plot_config: {
      enabled: false,
      annotations_enabled: false,
    },
    model_snapshot_retention_days: 10,
    daily_model_snapshot_retention_after_days: 1,
    allow_lazy_open: false,
    datafeed_config: {
      query: {
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
        },
      },
      indices: ['ft_farequote'],
      scroll_size: 1000,
      delayed_data_check_config: {
        enabled: true,
      },
      job_id: 'test',
      datafeed_id: 'datafeed-test',
    },
  };
}

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('Validate datafeed preview', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createIndex('farequote_empty', farequoteMappings);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices('farequote_empty');
    });

    it(`should validate a job with documents`, async () => {
      const job = getBaseJobConfig();

      const { body, status } = await supertest
        .post('/api/ml/validate/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.valid).to.eql(true, `valid should be true, but got ${body.valid}`);
      expect(body.documentsFound).to.eql(
        true,
        `documentsFound should be true, but got ${body.documentsFound}`
      );
    });

    it(`should fail to validate a job with documents and non-existent field`, async () => {
      const job = getBaseJobConfig();
      job.analysis_config.detectors[0].field_name = 'no_such_field';

      const { body, status } = await supertest
        .post('/api/ml/validate/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.valid).to.eql(false, `valid should be false, but got ${body.valid}`);
      expect(body.documentsFound).to.eql(
        false,
        `documentsFound should be false, but got ${body.documentsFound}`
      );
    });

    it(`should validate a job with no documents`, async () => {
      const job = getBaseJobConfig();
      job.datafeed_config.indices = ['farequote_empty'];

      const { body, status } = await supertest
        .post('/api/ml/validate/datafeed_preview')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.valid).to.eql(true, `valid should be true, but got ${body.valid}`);
      expect(body.documentsFound).to.eql(
        false,
        `documentsFound should be false, but got ${body.documentsFound}`
      );
    });

    it(`should fail for viewer user`, async () => {
      const job = getBaseJobConfig();

      const { body, status } = await supertest
        .post('/api/ml/validate/datafeed_preview')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job });
      ml.api.assertResponseStatusCode(403, status, body);
    });

    it(`should fail for unauthorized user`, async () => {
      const job = getBaseJobConfig();

      const { body, status } = await supertest
        .post('/api/ml/validate/datafeed_preview')
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send({ job });
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};
