/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  DeleteAgentPolicyRequest,
  DeletePackagePoliciesRequest,
  epmRouteService,
  GetPackagePoliciesResponse,
  GetFullAgentPolicyResponse,
  type GetInfoResponse,
} from '@kbn/fleet-plugin/common';
import { policyFactory } from '@kbn/security-solution-plugin/common/endpoint/models/policy_config';
import { Immutable } from '@kbn/security-solution-plugin/common/endpoint/types';

// NOTE: import path below should be the deep path to the actual module - else we get CI errors
import { pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public/services/pkg_key_from_package_info';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { FtrProviderContext } from '../configs/ftr_provider_context';

const FLEET_API_ROOT = '/api/fleet';
const FLEET_API_AGENT_POLICIES = `${FLEET_API_ROOT}/agent_policies`;
const FLEET_API_AGENT_POLICIES_DELETE = `${FLEET_API_AGENT_POLICIES}/delete`;
const FLEET_API_PACKAGE_POLICIES = `${FLEET_API_ROOT}/package_policies`;
const FLEET_API_PACKAGE_POLICIES_DELETE = `${FLEET_API_PACKAGE_POLICIES}/delete`;

/**
 * Holds information about the test resources created to support an Endpoint Policy
 */
export interface PolicyTestResourceInfo {
  /** The Fleet agent policy created */
  agentPolicy: Immutable<CreateAgentPolicyResponse['item']>;
  /** The Fleet Package Policy created and added to agent policy.
   * This is where Endpoint Policy is stored.
   */
  packagePolicy: Immutable<CreatePackagePolicyResponse['item']>;
  /**
   * Information about the endpoint package
   */
  packageInfo: Immutable<GetInfoResponse['item']>;
  /** will clean up (delete) the objects created (Agent Policy + Package Policy) */
  cleanup: () => Promise<void>;
}

export function EndpointPolicyTestResourcesProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  const logSupertestApiErrorAndThrow = (message: string, error: any): never => {
    const responseBody = error?.response?.body;
    const responseText = error?.response?.text;
    log.error(`Error occurred at ${Date.now()} | ${new Date().toISOString()}`);
    log.error(JSON.stringify(responseBody || responseText, null, 2));
    log.error(error);
    throw new Error(message);
  };
  const retrieveEndpointPackageInfo = (() => {
    // Retrieve information about the Endpoint security package
    // EPM does not currently have an API to get the "lastest" information for a page given its name,
    // so we'll retrieve a list of packages for a category of Security, and will then find the
    // endpoint package info. in the list. The request is kicked off here, but handled below after
    // Agent Policy creation so that they can be executed concurrently
    let apiRequest: Promise<GetInfoResponse['item'] | undefined>;
    const path = epmRouteService.getInfoPath('endpoint');

    return () => {
      if (!apiRequest) {
        log.info(`Setting up call to retrieve Endpoint package from ${path}`);

        // Currently (as of 2020-june) the package registry used in CI is the public one and
        // at times it encounters network connection issues. We use `retry.try` below to see if
        // subsequent requests get through.
        apiRequest = retry.try(() => {
          return supertest
            .get(path)
            .set('kbn-xsrf', 'xxx')
            .expect(200)
            .catch((error) => {
              return logSupertestApiErrorAndThrow(
                `Unable to retrieve Endpoint package via Fleet!`,
                error
              );
            })
            .then((response: { body: GetInfoResponse }) => {
              const endpointPackageInfo = response.body.item;
              if (!endpointPackageInfo) {
                throw new Error(`Endpoint package was not in response from ${path}`);
              }

              log.info(`Endpoint package version: ${endpointPackageInfo.version}`);

              return Promise.resolve(endpointPackageInfo);
            });
        });
      } else {
        log.info('Using cached retrieval of endpoint package');
      }
      return apiRequest;
    };
  })();

  return {
    /**
     * Returns the endpoint package key for the currently installed package. This `pkgkey` can then
     * be used to build URLs for Fleet pages or APIs
     */
    async getEndpointPkgKey() {
      return pkgKeyFromPackageInfo((await retrieveEndpointPackageInfo())!);
    },

    /**
     * Retrieves the currently installed endpoint package
     */
    async getEndpointPackage(): Promise<Immutable<GetInfoResponse['item']>> {
      const endpointPackage = await retrieveEndpointPackageInfo();

      if (!endpointPackage) {
        throw new EndpointError(`endpoint package not installed`);
      }

      return endpointPackage;
    },

    /**
     * Retrieves the full Agent policy, which mirrors what the Elastic Agent would get
     * once they checkin.
     */
    async getFullAgentPolicy(agentPolicyId: string): Promise<GetFullAgentPolicyResponse['item']> {
      let fullAgentPolicy: GetFullAgentPolicyResponse['item'];
      try {
        const apiResponse: { body: GetFullAgentPolicyResponse } = await supertest
          .get(`${FLEET_API_AGENT_POLICIES}/${agentPolicyId}/full`)
          .expect(200);

        fullAgentPolicy = apiResponse.body.item;
      } catch (error) {
        return logSupertestApiErrorAndThrow('Unable to get full Agent policy', error);
      }

      return fullAgentPolicy!;
    },

    /**
     * Creates a Fleet Agent policy and adds to it the Endpoint Package Policy that
     * stores the Policy configuration data
     */
    async createPolicy({
      agentPolicyOverrides = {},
      integrationPolicyOverrides = {},
    }: Partial<{
      agentPolicyOverrides: Partial<CreateAgentPolicyRequest['body']>;
      integrationPolicyOverrides: Partial<CreatePackagePolicyRequest['body']>;
    }> = {}): Promise<PolicyTestResourceInfo> {
      // create Agent Policy
      let agentPolicy: CreateAgentPolicyResponse['item'];
      try {
        const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
          name: `East Coast ${uuidv4()}`,
          description: 'East Coast call center',
          namespace: 'default',
          ...agentPolicyOverrides,
        };
        const { body: createResponse }: { body: CreateAgentPolicyResponse } = await supertest
          .post(FLEET_API_AGENT_POLICIES)
          .set('kbn-xsrf', 'xxx')
          .send(newAgentPolicyData)
          .expect(200);
        agentPolicy = createResponse.item;
      } catch (error) {
        return logSupertestApiErrorAndThrow(`Unable to create Agent Policy via Fleet!`, error);
      }

      // Retrieve the Endpoint package information
      const endpointPackageInfo = await retrieveEndpointPackageInfo();

      // create Package Policy and associated it to Agent Policy
      let packagePolicy: CreatePackagePolicyResponse['item'];
      try {
        const newPackagePolicyData: CreatePackagePolicyRequest['body'] = {
          name: `Protect East Coast ${uuidv4()}`,
          description: 'Protect the worlds data - but in the East Coast',
          policy_ids: [agentPolicy!.id],
          enabled: true,
          inputs: [
            {
              type: 'ENDPOINT_INTEGRATION_CONFIG',
              enabled: true,
              streams: [],
              config: {
                policy: {
                  value: policyFactory(),
                },
                _config: {
                  value: {
                    type: 'endpoint',
                    endpointConfig: {
                      preset: 'EDRComplete',
                    },
                  },
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
          ...integrationPolicyOverrides,
        };
        const { body: createResponse }: { body: CreatePackagePolicyResponse } = await supertest
          .post(FLEET_API_PACKAGE_POLICIES)
          .set('kbn-xsrf', 'xxx')
          .send(newPackagePolicyData)
          .expect(200);
        packagePolicy = createResponse.item;
      } catch (error) {
        return logSupertestApiErrorAndThrow(`Unable to create Package Policy via Fleet!`, error);
      }

      log.info(
        `Created Fleet Agent Policy: ${agentPolicy.id}\n`,
        `Created Fleet Endpoint Package Policy: ${packagePolicy.id}`
      );

      return {
        agentPolicy,
        packagePolicy,
        packageInfo: endpointPackageInfo!,
        async cleanup() {
          // Delete Package Policy
          try {
            const deletePackagePolicyData: DeletePackagePoliciesRequest['body'] = {
              packagePolicyIds: [packagePolicy.id],
            };
            await supertest
              .post(FLEET_API_PACKAGE_POLICIES_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send(deletePackagePolicyData)
              .expect(200);
            log.info(`Fleet Endpoint integration policy deleted: ${packagePolicy.id}`);
          } catch (error) {
            logSupertestApiErrorAndThrow(
              `Unable to delete Endpoint Integration Policy [${packagePolicy.id}] via Fleet!`,
              error
            );
          }

          // Delete Agent Policy
          try {
            const deleteAgentPolicyData: DeleteAgentPolicyRequest['body'] = {
              agentPolicyId: agentPolicy.id,
            };
            await supertest
              .post(FLEET_API_AGENT_POLICIES_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send(deleteAgentPolicyData)
              .expect(200);
            log.info(`Fleet Agent policy deleted: ${agentPolicy.id}`);
          } catch (error) {
            logSupertestApiErrorAndThrow(
              `Unable to delete Agent Policy [${agentPolicy.id}] via Fleet!`,
              error
            );
          }
        },
      };
    },

    /**
     * Deletes a policy (Package Policy) by using the policy name
     * @param name
     */
    async deletePolicyByName(name: string) {
      let packagePolicyList: GetPackagePoliciesResponse['items'];
      try {
        const { body: packagePoliciesResponse }: { body: GetPackagePoliciesResponse } =
          await supertest
            .get(FLEET_API_PACKAGE_POLICIES)
            .set('kbn-xsrf', 'xxx')
            .query({ kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: ${name}` })
            .send()
            .expect(200);
        packagePolicyList = packagePoliciesResponse.items;
      } catch (error) {
        return logSupertestApiErrorAndThrow(
          `Unable to get list of Package Policies with name=${name}`,
          error
        );
      }

      if (packagePolicyList.length === 0) {
        throw new Error(`Policy named '${name}' was not found!`);
      }

      if (packagePolicyList.length > 1) {
        throw new Error(`Found ${packagePolicyList.length} Policies - was expecting only one!`);
      }

      try {
        const deletePackagePolicyData: DeletePackagePoliciesRequest['body'] = {
          packagePolicyIds: [packagePolicyList[0].id],
        };
        await supertest
          .post(FLEET_API_PACKAGE_POLICIES_DELETE)
          .set('kbn-xsrf', 'xxx')
          .send(deletePackagePolicyData)
          .expect(200);
      } catch (error) {
        logSupertestApiErrorAndThrow('Unable to delete Package Policy via Fleet!', error);
      }
    },
  };
}
