/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  RISK_SCORE_CREATE_INDEX,
  RISK_SCORE_DELETE_INDICES,
  RISK_SCORE_INDEX_STATUS_API_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  creatLegacyHostRiskScorePiovtTransformIndexOptions,
  creatLegacyHostRiskScoreLatestTransformIndexOptions,
  creatLegacyUserRiskScorePiovtTransformIndexOptions,
  creatLegacyUserRiskScoreLatestTransformIndexOptions,
} from './mocks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Indices status', () => {
    beforeEach(async () => {
      const response = await supertest
        .post(RISK_SCORE_DELETE_INDICES)
        .set('kbn-xsrf', 'true')
        .send({
          indices: [
            'ml_host_risk_score_default',
            'ml_host_risk_score_latest_default',
            'ml_user_risk_score_default',
            'ml_user_risk_score_latest_default',
          ],
        });
    });
    afterEach(async () => {
      const response = await supertest
        .post(RISK_SCORE_DELETE_INDICES)
        .set('kbn-xsrf', 'true')
        .send({
          indices: [
            'ml_host_risk_score_default',
            'ml_host_risk_score_latest_default',
            'ml_user_risk_score_default',
            'ml_user_risk_score_latest_default',
          ],
        });
    });

    it('checks if ml_host_risk_score_default is deprecated', async () => {
      const response = await supertest
        .get(`${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_host_risk_score_default&entity=host`)
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.body.isDeprecated).to.be(false);
      expect(response.body.isEnabled).to.be(false);

      await supertest
        .put(RISK_SCORE_CREATE_INDEX)
        .set('kbn-xsrf', 'true')
        .send(creatLegacyHostRiskScorePiovtTransformIndexOptions);

      const result = await supertest
        .get(`${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_host_risk_score_default&entity=host`)
        .set('kbn-xsrf', 'true');

      expect(result.status).to.be(200);
      expect(result.body.isDeprecated).to.be(true);
      expect(result.body.isEnabled).to.be(true);
    });

    it('checks if ml_host_risk_score_latest_default is deprecated', async () => {
      const response = await supertest
        .get(
          `${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_host_risk_score_latest_default&entity=host`
        )
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.body.isDeprecated).to.be(false);
      expect(response.body.isEnabled).to.be(false);

      await supertest
        .put(RISK_SCORE_CREATE_INDEX)
        .set('kbn-xsrf', 'true')
        .send(creatLegacyHostRiskScoreLatestTransformIndexOptions);

      const result = await supertest
        .get(
          `${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_host_risk_score_latest_default&entity=host`
        )
        .set('kbn-xsrf', 'true');

      expect(result.status).to.be(200);
      expect(result.body.isDeprecated).to.be(true);
      expect(result.body.isEnabled).to.be(true);
    });

    it('checks if ml_user_risk_score_default is deprecated', async () => {
      const response = await supertest
        .get(`${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_user_risk_score_default&entity=user`)
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.body.isDeprecated).to.be(false);
      expect(response.body.isEnabled).to.be(false);

      await supertest
        .put(RISK_SCORE_CREATE_INDEX)
        .set('kbn-xsrf', 'true')
        .send(creatLegacyUserRiskScorePiovtTransformIndexOptions);

      const result = await supertest
        .get(`${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_user_risk_score_default&entity=user`)
        .set('kbn-xsrf', 'true');

      expect(result.status).to.be(200);
      expect(result.body.isDeprecated).to.be(true);
      expect(result.body.isEnabled).to.be(true);
    });

    it('checks if ml_user_risk_score_latest_default is deprecated', async () => {
      const response = await supertest
        .get(
          `${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_user_risk_score_latest_default&entity=user`
        )
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.body.isDeprecated).to.be(false);
      expect(response.body.isEnabled).to.be(false);

      await supertest
        .put(RISK_SCORE_CREATE_INDEX)
        .set('kbn-xsrf', 'true')
        .send(creatLegacyUserRiskScoreLatestTransformIndexOptions);

      const result = await supertest
        .get(
          `${RISK_SCORE_INDEX_STATUS_API_URL}?indexName=ml_user_risk_score_latest_default&entity=user`
        )
        .set('kbn-xsrf', 'true');

      expect(result.status).to.be(200);
      expect(result.body.isDeprecated).to.be(true);
      expect(result.body.isEnabled).to.be(true);
    });
  });
}
