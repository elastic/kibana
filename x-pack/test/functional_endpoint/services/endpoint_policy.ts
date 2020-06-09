/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import {
  CreateAgentConfigRequest,
  CreateAgentConfigResponse,
  CreateDatasourceRequest,
  CreateDatasourceResponse,
  DeleteAgentConfigRequest,
  DeleteDatasourcesRequest,
  GetFullAgentConfigResponse,
  GetPackagesResponse,
} from '../../../plugins/ingest_manager/common';
import { factory as policyConfigFactory } from '../../../plugins/security_solution/common/endpoint/models/policy_config';
import { Immutable } from '../../../plugins/security_solution/common/endpoint/types';

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
  /**
   * Information about the endpoint package
   */
  packageInfo: Immutable<GetPackagesResponse['response'][0]>;
  /** will clean up (delete) the objects created (agent config + datasource) */
  cleanup: () => Promise<void>;
}

export function EndpointPolicyTestResourcesProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  const logSupertestApiErrorAndThrow = (message: string, error: any) => {
    const responseBody = error?.response?.body;
    const responseText = error?.response?.text;
    log.error(JSON.stringify(responseBody || responseText, null, 2));
    log.error(error);
    throw new Error(message);
  };

  return {
    /**
     * Retrieves the full Agent configuration, which mirrors what the Elastic Agent would get
     * once they checkin.
     */
    async getFullAgentConfig(agentConfigId: string): Promise<GetFullAgentConfigResponse['item']> {
      let fullAgentConfig: GetFullAgentConfigResponse['item'];
      try {
        const apiResponse: { body: GetFullAgentConfigResponse } = await supertest
          .get(`${INGEST_API_AGENT_CONFIGS}/${agentConfigId}/full`)
          .expect(200);

        fullAgentConfig = apiResponse.body.item;
      } catch (error) {
        logSupertestApiErrorAndThrow('Unable to get full Agent Configuration', error);
      }

      return fullAgentConfig!;
    },

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
        const newAgentconfigData: CreateAgentConfigRequest['body'] = {
          name: 'East Coast',
          description: 'East Coast call center',
          namespace: 'default',
        };
        const { body: createResponse }: { body: CreateAgentConfigResponse } = await supertest
          .post(INGEST_API_AGENT_CONFIGS)
          .set('kbn-xsrf', 'xxx')
          .send(newAgentconfigData)
          .expect(200);
        agentConfig = createResponse.item;
      } catch (error) {
        logSupertestApiErrorAndThrow(`Unable to create Agent Config via Ingest!`, error);
      }

      // Retrieve the Endpoint package information
      let endpointPackageInfo: GetPackagesResponse['response'][0] | undefined;
      try {
        const { body: secPackages }: { body: GetPackagesResponse } = await secPackagesRequest;
        endpointPackageInfo = secPackages.response.find(
          (epmPackage) => epmPackage.name === 'endpoint'
        );
        if (!endpointPackageInfo) {
          throw new Error(`Endpoint package was not found via ${SECURITY_PACKAGES_ROUTE}`);
        }
      } catch (error) {
        logSupertestApiErrorAndThrow(`Unable to retrieve Endpoint package via Ingest!`, error);
      }

      // create datasource and associated it to agent config
      let datasource: CreateDatasourceResponse['item'];
      try {
        const newDatasourceData: CreateDatasourceRequest['body'] = {
          name: 'Protect East Coast',
          description: 'Protect the worlds data - but in the East Coast',
          config_id: agentConfig!.id,
          enabled: true,
          output_id: '',
          inputs: [
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
          namespace: 'default',
          package: {
            name: 'endpoint',
            title: endpointPackageInfo?.title ?? '',
            version: endpointPackageInfo?.version ?? '',
          },
        };
        const { body: createResponse }: { body: CreateDatasourceResponse } = await supertest
          .post(INGEST_API_DATASOURCES)
          .set('kbn-xsrf', 'xxx')
          .send(newDatasourceData)
          .expect(200);
        datasource = createResponse.item;
      } catch (error) {
        logSupertestApiErrorAndThrow(`Unable to create Datasource via Ingest!`, error);
      }

      return {
        agentConfig: agentConfig!,
        datasource: datasource!,
        packageInfo: endpointPackageInfo!,
        async cleanup() {
          // Delete Datasource
          try {
            const deleteDatasourceData: DeleteDatasourcesRequest['body'] = {
              datasourceIds: [datasource.id],
            };
            await supertest
              .post(INGEST_API_DATASOURCES_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send(deleteDatasourceData)
              .expect(200);
          } catch (error) {
            logSupertestApiErrorAndThrow('Unable to delete Datasource via Ingest!', error);
          }

          // Delete Agent config
          try {
            const deleteAgentConfigData: DeleteAgentConfigRequest['body'] = {
              agentConfigId: agentConfig.id,
            };
            await supertest
              .post(INGEST_API_AGENT_CONFIGS_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send(deleteAgentConfigData)
              .expect(200);
          } catch (error) {
            logSupertestApiErrorAndThrow('Unable to delete Agent Config via Ingest!', error);
          }
        },
      };
    },
  };
}
