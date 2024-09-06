/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';
import type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  describe('List connectors', () => {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await deleteAllActionConnectors({
        supertest: supertestWithoutAuth,
        roleAuthc,
        internalReqHeader,
      });
    });

    after(async () => {
      await deleteAllActionConnectors({
        supertest: supertestWithoutAuth,
        roleAuthc,
        internalReqHeader,
      });
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('Returns a 2xx for enterprise license', async () => {
      await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/connectors',
          roleAuthc,
          internalReqHeader,
        })
        .expect(200);
    });

    it('returns an empty list of connectors', async () => {
      const res = await observabilityAIAssistantAPIClient.slsUser({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
        roleAuthc,
        internalReqHeader,
      });

      expect(res.body.length).to.be(0);
    });

    it("returns the gen ai connector if it's been created", async () => {
      const connectorId = await createProxyActionConnector({
        supertest: supertestWithoutAuth,
        log,
        port: 1234,
        internalReqHeader,
        roleAuthc,
      });

      const res = await observabilityAIAssistantAPIClient.slsUser({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
        internalReqHeader,
        roleAuthc,
      });

      expect(res.body.length).to.be(1);

      await deleteActionConnector({
        supertest: supertestWithoutAuth,
        connectorId,
        log,
        internalReqHeader,
        roleAuthc,
      });
    });
  });
}

export async function deleteAllActionConnectors({
  supertest,
  roleAuthc,
  internalReqHeader,
}: {
  supertest: SupertestWithoutAuthProviderType;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
}): Promise<any> {
  const res = await supertest
    .get(`/api/actions/connectors`)
    .set(roleAuthc.apiKeyHeader)
    .set(internalReqHeader);

  const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
  return Promise.all(
    body.map(({ id }) => {
      return supertest
        .delete(`/api/actions/connector/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader);
    })
  );
}
