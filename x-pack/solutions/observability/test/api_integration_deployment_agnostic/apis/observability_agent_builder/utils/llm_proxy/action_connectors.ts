/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export async function createLlmProxyActionConnector(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { port }: { port: number }
) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const logger = getService('log');

  const internalReqHeader = samlAuth.getInternalRequestHeader();
  const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

  try {
    const res = await supertestWithoutAuth
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
    logger.error(`Failed to create action connector due to: ${e}`);
    throw e;
  }
}

export async function deleteActionConnector(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { actionId }: { actionId: string }
) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  const internalReqHeader = samlAuth.getInternalRequestHeader();
  const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

  return supertestWithoutAuth
    .delete(`/api/actions/connector/${actionId}`)
    .set(roleAuthc.apiKeyHeader)
    .set(internalReqHeader);
}
