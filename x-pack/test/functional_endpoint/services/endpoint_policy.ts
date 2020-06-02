/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import {
  CreateAgentConfigResponse,
  CreateDatasourceResponse,
} from '../../../plugins/ingest_manager/common';
import { Immutable } from '../../../plugins/siem/common/endpoint/types';
import { factory as policyConfigFactory } from '../../../plugins/siem/common/endpoint/models/policy_config';

const INGEST_API_ROOT = '/api/ingest_manager';
const INGEST_API_AGENT_CONFIGS = `${INGEST_API_ROOT}/agent_configs`;
const INGEST_API_AGENT_CONFIGS_DELETE = `${INGEST_API_AGENT_CONFIGS}/delete`;
const INGEST_API_DATASOURCES = `${INGEST_API_ROOT}/datasources`;
const INGEST_API_DATASOURCES_DELETE = `${INGEST_API_DATASOURCES}/delete`;

/**
 * Holds information about the test resources created to support an Endpoint Policy
 */
export interface PolicyTestResourceInfo {
  /** The Ingest agent configuration created */
  agentConfig: Immutable<CreateAgentConfigResponse['item']>;
  /** The Ingest datasource created and added to agent configuration.
   * This is where Endpoint Policy is stored.
   */
  datasource: Immutable<CreateDatasourceResponse['item']>;
  /** will clean up (delete) the objects created (agent config + datasource) */
  cleanup: () => Promise<void>;
}

export function EndpointPolicyTestResourcesProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  return {
    /**
     * Creates an Ingest Agent Configuration and adds to it the Endpoint Datasource that
     * stores the Policy configuration data
     */
    async createPolicy(): Promise<PolicyTestResourceInfo> {
      // FIXME: Refactor after https://github.com/elastic/kibana/issues/64822 is fixed. `isInitialized` setup below should be deleted
      // Due to an issue in Ingest API, we first create the Fleet user. This avoids the Agent Config api throwing a 500
      const isFleetSetupResponse = await supertest
        .get('/api/ingest_manager/fleet/setup')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      if (!isFleetSetupResponse.body.isInitialized) {
        await supertest
          .post('/api/ingest_manager/fleet/setup')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
      }

      // create agent config
      const {
        body: { item: agentConfig },
      }: { body: CreateAgentConfigResponse } = await supertest
        .post(INGEST_API_AGENT_CONFIGS)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'East Coast', description: 'East Coast call center', namespace: '' })
        .expect(200);

      // create datasource and associated it to agent config
      const {
        body: { item: datasource },
      }: { body: CreateDatasourceResponse } = await supertest
        .post(INGEST_API_DATASOURCES)
        .set('kbn-xsrf', 'xxx')
        .send({
          name: 'Protect East Coast',
          description: 'Protect the worlds data - but in the East Coast',
          config_id: agentConfig.id,
          enabled: true,
          output_id: '',
          inputs: [
            // TODO: should we retrieve the latest Endpoint Package and build the input (policy) from that?
            {
              type: 'endpoint',
              enabled: true,
              streams: [],
              config: {
                policy: {
                  value: policyConfigFactory(),
                },
              },
            },
          ],
          namespace: '',
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '1.0.0',
          },
        })
        .expect(200);

      return {
        agentConfig,
        datasource,
        async cleanup() {
          // Delete Datasource
          await supertest
            .post(INGEST_API_DATASOURCES_DELETE)
            .set('kbn-xsrf', 'xxx')
            .send({ datasourceIds: [datasource.id] })
            .expect(200);

          // Delete Agent config
          await supertest
            .post(INGEST_API_AGENT_CONFIGS_DELETE)
            .set('kbn-xsrf', 'xxx')
            .send({ agentConfigId: agentConfig.id })
            .expect(200);
        },
      };
    },
  };
}
