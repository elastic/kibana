/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticApmAgentLatestVersion } from '@kbn/apm-plugin/common/agent_explorer';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const nodeAgentName = 'nodejs';
  const unlistedAgentName = 'unlistedAgent';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/get_latest_agent_versions',
    });
  }

  registry.when(
    'Agent latest versions when configuration is defined',
    { config: 'basic', archives: [] },
    () => {
      it('returns a version when agent is listed in the file', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);

        const agents = body.data;

        const nodeAgent = agents[nodeAgentName] as ElasticApmAgentLatestVersion;
        expect(nodeAgent?.latest_version).not.to.be(undefined);
      });

      it('returns undefined when agent is not listed in the file', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);

        const agents = body.data;

        // @ts-ignore
        const unlistedAgent = agents[unlistedAgentName] as ElasticApmAgentLatestVersion;
        expect(unlistedAgent?.latest_version).to.be(undefined);
      });
    }
  );
}
