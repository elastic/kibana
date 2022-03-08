/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  DeletePackagePoliciesRequest,
  GetPackagePoliciesResponse,
  GetFullAgentPolicyResponse,
  GetPackagesResponse,
  GetAgentPoliciesResponse,
} from '../../../../plugins/fleet/common';

const INGEST_API_ROOT = '/api/fleet';
const INGEST_API_AGENT_POLICIES = `${INGEST_API_ROOT}/agent_policies`;
const INGEST_API_PACKAGE_POLICIES = `${INGEST_API_ROOT}/package_policies`;
const INGEST_API_PACKAGE_POLICIES_DELETE = `${INGEST_API_PACKAGE_POLICIES}/delete`;
const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;

export function SyntheticsPackageProvider({ getService }: FtrProviderContext) {
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
  const retrieveSyntheticsPackageInfo = (() => {
    // Retrieve information about the Synthetics package
    // EPM does not currently have an API to get the "lastest" information for a page given its name,
    // so we'll retrieve a list of packages and then find the package info in the list.
    let apiRequest: Promise<GetPackagesResponse['items'][0] | undefined>;

    return () => {
      if (!apiRequest) {
        log.info(`Setting up call to retrieve Synthetics package`);

        // Currently (as of 2020-june) the package registry used in CI is the public one and
        // at times it encounters network connection issues. We use `retry.try` below to see if
        // subsequent requests get through.
        apiRequest = retry.try(() => {
          return supertest
            .get(INGEST_API_EPM_PACKAGES)
            .query({ experimental: true })
            .set('kbn-xsrf', 'xxx')
            .expect(200)
            .catch((error) => {
              return logSupertestApiErrorAndThrow(`Unable to retrieve packages via Ingest!`, error);
            })
            .then((response: { body: GetPackagesResponse }) => {
              const { body } = response;
              const syntheticsPackageInfo = body.items.find(
                (epmPackage) => epmPackage.name === 'synthetics'
              );
              if (!syntheticsPackageInfo) {
                throw new Error(
                  `Synthetics package was not in response from ${INGEST_API_EPM_PACKAGES}`
                );
              }
              return Promise.resolve(syntheticsPackageInfo);
            });
        });
      } else {
        log.info('Using cached retrieval of synthetics package');
      }
      return apiRequest;
    };
  })();

  return {
    /**
     * Returns the synthetics package version for the currently installed package. This version can then
     * be used to build URLs for Fleet pages or APIs
     */
    async getSyntheticsPackageVersion() {
      const syntheticsPackage = await retrieveSyntheticsPackageInfo()!;

      return syntheticsPackage?.version;
    },

    /**
     * Retrieves the full Agent policy by id, which mirrors what the Elastic Agent would get
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
     * Retrieves all the agent policies.
     */
    async getAgentPolicyList(): Promise<GetAgentPoliciesResponse['items']> {
      let agentPolicyList: GetAgentPoliciesResponse['items'];
      try {
        const apiResponse: { body: GetAgentPoliciesResponse } = await supertest
          .get(INGEST_API_AGENT_POLICIES)
          .expect(200);

        agentPolicyList = apiResponse.body.items;
      } catch (error) {
        return logSupertestApiErrorAndThrow('Unable to get full Agent policy list', error);
      }

      return agentPolicyList!;
    },

    /**
     * Deletes a policy (Package Policy) by using the policy name
     * @param name
     */
    async deletePolicyByName(name: string) {
      const id = await this.getPackagePolicyIdByName(name);

      if (id) {
        try {
          const deletePackagePolicyData: DeletePackagePoliciesRequest['body'] = {
            packagePolicyIds: [id],
          };
          await supertest
            .post(INGEST_API_PACKAGE_POLICIES_DELETE)
            .set('kbn-xsrf', 'xxx')
            .send(deletePackagePolicyData)
            .expect(200);
        } catch (error) {
          logSupertestApiErrorAndThrow(
            `Unable to delete Package Policy via Ingest! ${name}`,
            error
          );
        }
      }
    },

    /**
     * Gets the policy id (Package Policy) by using the policy name
     * @param name
     */
    async getPackagePolicyIdByName(name: string) {
      const { body: packagePoliciesResponse }: { body: GetPackagePoliciesResponse } =
        await supertest
          .get(INGEST_API_PACKAGE_POLICIES)
          .set('kbn-xsrf', 'xxx')
          .query({ kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: ${name}` })
          .send()
          .expect(200);
      const packagePolicyList: GetPackagePoliciesResponse['items'] = packagePoliciesResponse.items;

      if (packagePolicyList.length > 1) {
        throw new Error(`Found ${packagePolicyList.length} Policies - was expecting only one!`);
      }

      if (packagePolicyList.length) {
        return packagePolicyList[0].id;
      }
    },
  };
}
