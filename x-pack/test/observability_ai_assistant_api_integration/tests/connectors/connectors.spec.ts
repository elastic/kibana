/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Agent as SuperTestAgent } from 'supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ForbiddenApiError } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertest = getService('supertest');

  const CONNECTOR_API_URL = '/internal/observability_ai_assistant/connectors';

  describe('List connectors', () => {
    before(async () => {
      await deleteAllActionConnectors(supertest);
    });

    after(async () => {
      await deleteAllActionConnectors(supertest);
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        try {
          await observabilityAIAssistantAPIClient.unauthorizedUser({
            endpoint: `GET ${CONNECTOR_API_URL}`,
          });
          throw new ForbiddenApiError('Expected unauthorizedUser() to throw a 403 Forbidden error');
        } catch (e) {
          expect(e.status).to.be(403);
        }
      });
    });
  });
}

export async function deleteAllActionConnectors(supertest: SuperTestAgent): Promise<any> {
  const res = await supertest.get(`/api/actions/connectors`);

  const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
  return Promise.all(
    body.map(({ id }) => {
      return supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'foo');
    })
  );
}
