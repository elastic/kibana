/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');

  // @ts-expect-error not full interface
  const JOB_CONFIG: Job = {
    job_id: `fq_multi_1_ae`,
    description:
      'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
    groups: ['farequote', 'automated', 'multi-metric'],
    analysis_config: {
      bucket_span: '1h',
      influencers: ['airline'],
      detectors: [
        { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
        { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
        { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '20mb' },
    model_plot_config: { enabled: true },
  };

  // @ts-expect-error not full interface
  const DATAFEED_CONFIG: Datafeed = {
    datafeed_id: 'datafeed-fq_multi_1_ae',
    indices: ['ft_farequote'],
    job_id: 'fq_multi_1_ae',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  async function createMockJobs() {
    await ml.api.createAnomalyDetectionJob(JOB_CONFIG);
    await ml.api.createDatafeed(DATAFEED_CONFIG);
    await ml.api.openAnomalyDetectionJob(JOB_CONFIG.job_id);
    await ml.api.startDatafeed(DATAFEED_CONFIG.datafeed_id);
  }

  describe('GET model_management/nodes_overview', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createTestTrainedModels('regression', 2);
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await createMockJobs();
    });

    after(async () => {
      await ml.api.closeAnomalyDetectionJob(JOB_CONFIG.job_id);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('returns nodes overview', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/model_management/nodes_overview`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.nodes[0].roles).to.contain('ml');
      expect(body.nodes[0].memory_overview.anomaly_detection.total).to.be.greaterThan(10000000);
      expect(body.nodes[0].memory_overview.dfa_training.total).to.eql(0);
      expect(body.nodes[0].memory_overview.trained_models.total).to.eql(0);
    });

    it('returns an error for the user with viewer permissions', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/model_management/nodes_overview`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, status, body);
    });

    it('returns an error for unauthorized user', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/model_management/nodes_overview`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};
