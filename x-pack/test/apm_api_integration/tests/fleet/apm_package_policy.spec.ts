/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createAgentPolicy,
  createPackagePolicy,
  deleteAgentPolicy,
  deletePackagePolicy,
  setupFleet,
} from './apm_package_policy_setup';

export default function ApiTest(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  async function createConfiguration(configuration: any) {
    return apmApiClient.writeUser({
      endpoint: 'PUT /api/apm/settings/agent-configuration',
      params: { body: configuration },
    });
  }

  async function deleteConfiguration(configuration: any) {
    return apmApiClient.writeUser({
      endpoint: 'DELETE /api/apm/settings/agent-configuration',
      params: { body: { service: configuration.service } },
    });
  }

  registry.when('APM package policy', { config: 'basic', archives: [] }, () => {
    let agentPolicyId: string;

    before(async () => {
      await setupFleet(ftrProviderContext);
      agentPolicyId = await createAgentPolicy(ftrProviderContext);
    });

    after(async () => {
      await deleteAgentPolicy(ftrProviderContext, agentPolicyId);
    });

    describe('APM package policy callbacks', () => {
      let apmPackagePolicy: any;

      beforeEach(async () => {
        apmPackagePolicy = await createPackagePolicy(ftrProviderContext, agentPolicyId);
      });

      afterEach(async () => {
        await deletePackagePolicy(ftrProviderContext, apmPackagePolicy.id);
      });

      it('sets default values for agent configs and source mapping in a new package policy', async () => {
        const apmPackageConfig = apmPackagePolicy.inputs[0].config['apm-server'].value;
        expect(apmPackageConfig.rum.source_mapping).to.eql({ metadata: [] });
        expect(apmPackageConfig.agent_config).to.eql([]);
      });

      describe('Agent config', () => {
        const testConfiguration = {
          service: {},
          settings: { transaction_sample_rate: '0.55' },
        };
        before(async () => {
          await createConfiguration(testConfiguration);
        });

        after(async () => {
          await deleteConfiguration(testConfiguration);
        });

        it('sets the expected agent configs on the new package policy object', async () => {
          const {
            agent_config: [{ service, config }],
          } = apmPackagePolicy.inputs[0].config['apm-server'].value;
          expect(service).to.eql({});
          expect(config).to.eql({ transaction_sample_rate: '0.55' });
        });
      });
    });
  });
}
