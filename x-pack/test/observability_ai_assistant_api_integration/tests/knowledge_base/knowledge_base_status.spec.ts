/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createKnowledgeBaseModel, deleteKnowledgeBaseModel, TINY_ELSER } from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ml = getService('ml');
  const KNOWLEDGE_BASE_API_URL = `/internal/observability_ai_assistant/kb`;

  describe(`${KNOWLEDGE_BASE_API_URL}/status`, () => {
    before(async () => {
      await createKnowledgeBaseModel(ml);

      await supertest
        .post(`${KNOWLEDGE_BASE_API_URL}/setup`)
        .set('kbn-xsrf', 'foo')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({});
        });
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
    });

    it('returns correct status after knowledge base is setup', async () => {
      return await supertest
        .get(`${KNOWLEDGE_BASE_API_URL}/status`)
        .set('kbn-xsrf', 'foo')
        .expect(200)
        .then((response) => {
          expect(response.body.deployment_state).to.eql('started');
          expect(response.body.model_name).to.eql('pt_tiny_elser');
        });
    });

    it('returns correct status after elser is stopped', async () => {
      await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
      return await supertest
        .get(`${KNOWLEDGE_BASE_API_URL}/status`)
        .set('kbn-xsrf', 'foo')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({
            ready: false,
            model_name: TINY_ELSER.id,
          });
        });
    });
  });
}
