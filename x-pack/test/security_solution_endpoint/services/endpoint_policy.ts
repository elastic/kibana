/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import {
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  DeleteAgentPolicyRequest,
  DeletePackagePoliciesRequest,
  GetPackagePoliciesResponse,
  GetFullAgentPolicyResponse,
  GetPackagesResponse,
} from '../../../plugins/ingest_manager/common';
import { factory as policyConfigFactory } from '../../../plugins/security_solution/common/endpoint/models/policy_config';
import { Immutable } from '../../../plugins/security_solution/common/endpoint/types';

const INGEST_API_ROOT = '/api/ingest_manager';
const INGEST_API_AGENT_POLICIES = `${INGEST_API_ROOT}/agent_policies`;
const INGEST_API_AGENT_POLICIES_DELETE = `${INGEST_API_AGENT_POLICIES}/delete`;
const INGEST_API_PACKAGE_POLICIES = `${INGEST_API_ROOT}/package_policies`;
const INGEST_API_PACKAGE_POLICIES_DELETE = `${INGEST_API_PACKAGE_POLICIES}/delete`;
const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;

const SECURITY_PACKAGES_ROUTE = `${INGEST_API_EPM_PACKAGES}?category=security`;

/**
 * Holds information about the test resources created to support an Endpoint Policy
 */
export interface PolicyTestResourceInfo {
  /** The Ingest agent policy created */
  agentPolicy: Immutable<CreateAgentPolicyResponse['item']>;
  /** The Ingest Package Policy created and added to agent policy.
   * This is where Endpoint Policy is stored.
   */
  packagePolicy: Immutable<CreatePackagePolicyResponse['item']>;
  /**
   * Information about the endpoint package
   */
  packageInfo: Immutable<GetPackagesResponse['response'][0]>;
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
    let apiRequest: Promise<GetPackagesResponse['response'][0] | undefined>;

    return () => {
      if (!apiRequest) {
        log.info(`Setting up call to retrieve Endpoint package from ${SECURITY_PACKAGES_ROUTE}`);

        // Currently (as of 2020-june) the package registry used in CI is the public one and
        // at times it encounters network connection issues. We use `retry.try` below to see if
        // subsequent requests get through.
        apiRequest = retry.try(() => {
          return supertest
            .get(SECURITY_PACKAGES_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .expect(200)
            .catch((error) => {
              return logSupertestApiErrorAndThrow(
                `Unable to retrieve Endpoint package via Ingest!`,
                error
              );
            })
            .then((response: { body: GetPackagesResponse }) => {
              const { body: secPackages } = response;
              const endpointPackageInfo = secPackages.response.find(
                (epmPackage) => epmPackage.name === 'endpoint'
              );
              if (!endpointPackageInfo) {
                throw new Error(
                  `Endpoint package was not in response from ${SECURITY_PACKAGES_ROUTE}`
                );
              }
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
     * Retrieves the full Agent policy, which mirrors what the Elastic Agent would get
     * once they checkin.
     */
    async getFullAgentPolicy(agentPolicyId: string): Promise<GetFullAgentPolicyResponse['item']> {
      let fullAgentPolicy: GetFullAgentPolicyResponse['item'];
      try {
        const apiResponse: { body: GetFullAgentPolicyResponse } = await supertest
          .get(`${INGEST_API_AGENT_POLICIES}/${agentPolicyId}/full`)
          .expect(200);

        fullAgentPolicy = apiResponse.body.item;
      } catch (error) {
        return logSupertestApiErrorAndThrow('Unable to get full Agent policy', error);
      }

      return fullAgentPolicy!;
    },

    /**
     * Creates an Ingest Agent policy and adds to it the Endpoint Package Policy that
     * stores the Policy configuration data
     */
    async createPolicy(): Promise<PolicyTestResourceInfo> {
      // create Agent Policy
      let agentPolicy: CreateAgentPolicyResponse['item'];
      try {
        const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
          name: 'East Coast',
          description: 'East Coast call center',
          namespace: 'default',
        };
        const { body: createResponse }: { body: CreateAgentPolicyResponse } = await supertest
          .post(INGEST_API_AGENT_POLICIES)
          .set('kbn-xsrf', 'xxx')
          .send(newAgentPolicyData)
          .expect(200);
        agentPolicy = createResponse.item;
      } catch (error) {
        return logSupertestApiErrorAndThrow(`Unable to create Agent Policy via Ingest!`, error);
      }

      // Retrieve the Endpoint package information
      const endpointPackageInfo = await retrieveEndpointPackageInfo();

      // create Package Policy and associated it to Agent Policy
      let packagePolicy: CreatePackagePolicyResponse['item'];
      try {
        const newPackagePolicyData: CreatePackagePolicyRequest['body'] = {
          name: 'Protect East Coast',
          description: 'Protect the worlds data - but in the East Coast',
          policy_id: agentPolicy!.id,
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
        const {
          body: createResponse,
        }: { body: CreatePackagePolicyResponse } = await supertest
          .post(INGEST_API_PACKAGE_POLICIES)
          .set('kbn-xsrf', 'xxx')
          .send(newPackagePolicyData)
          .expect(200);
        packagePolicy = createResponse.item;
      } catch (error) {
        return logSupertestApiErrorAndThrow(`Unable to create Package Policy via Ingest!`, error);
      }

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
              .post(INGEST_API_PACKAGE_POLICIES_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send(deletePackagePolicyData)
              .expect(200);
          } catch (error) {
            logSupertestApiErrorAndThrow('Unable to delete Package Policy via Ingest!', error);
          }

          // Delete Agent Policy
          try {
            const deleteAgentPolicyData: DeleteAgentPolicyRequest['body'] = {
              agentPolicyId: agentPolicy.id,
            };
            await supertest
              .post(INGEST_API_AGENT_POLICIES_DELETE)
              .set('kbn-xsrf', 'xxx')
              .send(deleteAgentPolicyData)
              .expect(200);
          } catch (error) {
            logSupertestApiErrorAndThrow('Unable to delete Agent Policy via Ingest!', error);
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
        const {
          body: packagePoliciesResponse,
        }: { body: GetPackagePoliciesResponse } = await supertest
          .get(INGEST_API_PACKAGE_POLICIES)
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
          .post(INGEST_API_PACKAGE_POLICIES_DELETE)
          .set('kbn-xsrf', 'xxx')
          .send(deletePackagePolicyData)
          .expect(200);
      } catch (error) {
        logSupertestApiErrorAndThrow('Unable to delete Package Policy via Ingest!', error);
      }
    },
  };
}
