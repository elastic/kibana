/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('ValidateCardinality', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it(`should recognize a valid cardinality`, async () => {
      const requestBody = {
        job_id: '',
        description: '',
        groups: [],
        analysis_config: {
          bucket_span: '10m',
          detectors: [
            {
              function: 'mean',
              field_name: 'products.base_price',
              partition_field_name: 'geoip.city_name',
            },
          ],
          influencers: ['geoip.city_name'],
        },
        data_description: { time_field: 'order_date' },
        analysis_limits: { model_memory_limit: '12MB' },
        model_plot_config: { enabled: true },
        datafeed_config: {
          datafeed_id: 'datafeed-',
          job_id: '',
          indices: ['ft_ecommerce'],
          query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/cardinality')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body).to.eql([{ id: 'success_cardinality' }]);
    });

    it(`should recognize a high model plot cardinality`, async () => {
      const requestBody = {
        job_id: '',
        description: '',
        groups: [],
        analysis_config: {
          bucket_span: '10m',
          detectors: [
            {
              function: 'mean',
              field_name: 'products.base_price',
              // some high cardinality field
              partition_field_name: 'order_id',
            },
          ],
          influencers: ['geoip.city_name'],
        },
        data_description: { time_field: 'order_date' },
        analysis_limits: { model_memory_limit: '11MB' },
        model_plot_config: { enabled: true },
        datafeed_config: {
          datafeed_id: 'datafeed-',
          job_id: '',
          indices: ['ft_ecommerce'],
          query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        },
      };
      const { body } = await supertest
        .post('/api/ml/validate/cardinality')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body).to.eql([
        { id: 'cardinality_model_plot_high', modelPlotCardinality: 4711 },
        { id: 'cardinality_partition_field', fieldName: 'order_id' },
      ]);
    });

    it('should not validate cardinality in case request payload is invalid', async () => {
      const requestBody = {
        job_id: '',
        description: '',
        groups: [],
        // missing analysis_config
        data_description: { time_field: 'order_date' },
        analysis_limits: { model_memory_limit: '12MB' },
        model_plot_config: { enabled: true },
        datafeed_config: {
          datafeed_id: 'datafeed-',
          job_id: '',
          indices: ['ft_ecommerce'],
          query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/cardinality')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(400);

      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.eql(
        '[request body.analysis_config.detectors]: expected value of type [array] but got [undefined]'
      );
    });

    it('should not validate cardinality if the user does not have required permissions', async () => {
      const requestBody = {
        job_id: '',
        description: '',
        groups: [],
        analysis_config: {
          bucket_span: '10m',
          detectors: [
            {
              function: 'mean',
              field_name: 'products.base_price',
              partition_field_name: 'geoip.city_name',
            },
          ],
          influencers: ['geoip.city_name'],
        },
        data_description: { time_field: 'order_date' },
        analysis_limits: { model_memory_limit: '12MB' },
        model_plot_config: { enabled: true },
        datafeed_config: {
          datafeed_id: 'datafeed-',
          job_id: '',
          indices: ['ft_ecommerce'],
          query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/cardinality')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });
  });
};
