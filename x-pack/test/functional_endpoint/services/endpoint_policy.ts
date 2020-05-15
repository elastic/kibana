/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import {
  CreateAgentConfigResponse,
  CreateDatasourceResponse,
  GetPackagesResponse,
} from '../../../plugins/ingest_manager/common';
import { Immutable } from '../../../plugins/endpoint/common/types';
import { factory as policyConfigFactory } from '../../../plugins/endpoint/common/models/policy_config';

const INGEST_API_ROOT = '/api/ingest_manager';
const INGEST_API_AGENT_CONFIGS = `${INGEST_API_ROOT}/agent_configs`;
const INGEST_API_AGENT_CONFIGS_DELETE = `${INGEST_API_AGENT_CONFIGS}/delete`;
const INGEST_API_DATASOURCES = `${INGEST_API_ROOT}/datasources`;
const INGEST_API_DATASOURCES_DELETE = `${INGEST_API_DATASOURCES}/delete`;
const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;

const SECURITY_PACKAGES_ROUTE = `${INGEST_API_EPM_PACKAGES}?category=security`;

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
  const log = getService('log');

  return {
    /**
     * Creates an Ingest Agent Configuration and adds to it the Endpoint Datasource that
     * stores the Policy configuration data
     */
    async createPolicy(): Promise<PolicyTestResourceInfo> {
      // Retrieve information about the Endpoint security package
      // EPM does not currently have an API to get the "lastest" information for a page given its name,
      // so we'll retrieve a list of packages for a category of Security, and will then find the
      // endpoint package info. in the list. The request is kicked off here, but handled below after
      // agent config creation so that they can be executed concurrently
      const secPackagesRequest = supertest
        .get(SECURITY_PACKAGES_ROUTE)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      // create agent config
      let agentConfig: CreateAgentConfigResponse['item'];
      try {
        const { body: createResponse }: { body: CreateAgentConfigResponse } = await supertest
          .post(INGEST_API_AGENT_CONFIGS)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'East Coast', description: 'East Coast call center', namespace: '' })
          .expect(200);
        agentConfig = createResponse.item;
      } catch (error) {
        log.error(error);
        throw new Error(`Unable to create Agent Config via Ingest!`);
      }

      // Retrieve the Endpoint package information
      let endpointPackageInfo: GetPackagesResponse['response'][0] | undefined;
      try {
        const { body: secPackages }: { body: GetPackagesResponse } = await secPackagesRequest;
        endpointPackageInfo = secPackages.response.find(
          epmPackage => epmPackage.name === 'endpoint'
        );
        if (!endpointPackageInfo) {
          throw new Error(`Endpoint package was not found via ${SECURITY_PACKAGES_ROUTE}`);
        }
      } catch (error) {
        log.error(error);
        throw new Error(`Unable to retrieve Endpoint package via Ingest!`);
      }

      // create datasource and associated it to agent config
      let datasource: CreateDatasourceResponse['item'];
      try {
        const { body: createResponse }: { body: CreateDatasourceResponse } = await supertest
          .post(INGEST_API_DATASOURCES)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'Protect East Coast',
            description: 'Protect the worlds data - but in the East Coast',
            config_id: agentConfig.id,
            enabled: true,
            output_id: '',
            inputs: [
              // TODO: should we retrieve the Endpoint Package definition information (another API call) and build the input (policy) from that?
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
              title: endpointPackageInfo.title,
              version: endpointPackageInfo.version,
            },
          })
          .expect(200);
        datasource = createResponse.item;
      } catch (error) {
        log.error(error);
        throw new Error(`Unable to create Datasource via Ingest!`);
      }

      return {
        agentConfig,
        datasource,
        async cleanup() {
          // Delete Datasource
          try {
            await supertest
              .post(INGEST_API_DATASOURCES_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send({ datasourceIds: [datasource.id] })
              .expect(200);
          } catch (error) {
            log.error(error);
            throw new Error('Unable to delete Datasource via Ingest!');
          }

          // Delete Agent config
          try {
            await supertest
              .post(INGEST_API_AGENT_CONFIGS_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send({ agentConfigId: agentConfig.id })
              .expect(200);
          } catch (error) {
            log.error(error);
            throw new Error('Unable to delete Agent Config via Ingest!');
          }
        },
      };
    },
  };
}
