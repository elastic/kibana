/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '../../../../../shared/services';

export async function deleteActionConnector({
  supertest,
  connectorId,
  log,
  roleAuthc,
  internalReqHeader,
}: {
  supertest: SupertestWithoutAuthProviderType;
  connectorId: string;
  log: ToolingLog;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
}) {
  try {
    await supertest
      .delete(`/api/actions/connector/${connectorId}`)
      .set(roleAuthc.apiKeyHeader)
      .set(internalReqHeader)
      .expect(204);
  } catch (e) {
    log.error(`Failed to delete action connector with id ${connectorId} due to: ${e}`);
    throw e;
  }
}

export async function createProxyActionConnector({
  log,
  supertest,
  port,
  roleAuthc,
  internalReqHeader,
}: {
  log: ToolingLog;
  supertest: SupertestWithoutAuthProviderType;
  port: number;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
}) {
  try {
    const res = await supertest
      .post('/api/actions/connector')
      .set(roleAuthc.apiKeyHeader)
      .set(internalReqHeader)
      .send({
        name: 'OpenAI Proxy',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${port}`,
        },
        secrets: {
          apiKey: 'my-api-key',
        },
      })
      .expect(200);

    const connectorId = res.body.id as string;
    return connectorId;
  } catch (e) {
    log.error(`Failed to create action connector due to: ${e}`);
    throw e;
  }
}
