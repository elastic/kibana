/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  DEFAULT_DIAGNOSTIC_INDEX_PATTERN,
  ENDPOINT_ACTION_RESPONSES_DS,
  ENDPOINT_HEARTBEAT_INDEX_PATTERN,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { buildIndexNameWithNamespace } from '@kbn/security-solution-plugin/common/endpoint/utils/index_name_utilities';
import {
  updateAgentPolicy,
  updateIntegrationPolicy,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { PolicyTestResourceInfo } from '../../../../../security_solution_endpoint/services/endpoint_policy';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const esClient = getService('es');
  const kbnClient = getService('kibanaServer');
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const isServerless = config.get('serverless');

  describe('@ess @serverless Creation of DOT indices for elastic defend policies', function () {
    let testData: PolicyTestResourceInfo;

    const getExpectedIndexList = (namespace: string): string[] => {
      const indexList = [
        buildIndexNameWithNamespace(ENDPOINT_ACTION_RESPONSES_DS, namespace),
        buildIndexNameWithNamespace(DEFAULT_DIAGNOSTIC_INDEX_PATTERN, namespace),
      ];

      if (isServerless) {
        indexList.push(buildIndexNameWithNamespace(ENDPOINT_HEARTBEAT_INDEX_PATTERN, namespace));
      }

      return indexList;
    };

    beforeEach(async () => {
      testData = await endpointPolicyTestResources.createPolicy({
        // Endpoint policy inherits namespace from Agent policy
        integrationPolicyOverrides: { namespace: undefined },
      });
    });

    afterEach(async () => {
      if (testData) {
        await testData.cleanup();
        // @ts-expect-error
        testData = undefined;
      }
    });

    it('should create indices when endpoint integration policy is created', async () => {
      for (const indexName of getExpectedIndexList('default')) {
        log.debug(`Checking that [${indexName}] exists`);
        // The creation of the indices is done in the background and may not be done by
        // the time the API call that created/updated the policy in fleet is returned - thus
        // we use retry logic below
        await retry.try(async () => {
          expect(await esClient.indices.exists({ index: indexName })).to.be(true);
        });
      }
    });

    it('should create new indices when endpoint policy is updated with new namespace', async () => {
      const namespace = Math.random().toString(32).substring(2);
      await updateIntegrationPolicy(kbnClient, testData.packagePolicy.id, { namespace }, true);

      for (const indexName of getExpectedIndexList(namespace)) {
        log.debug(`Checking that [${indexName}] exists`);
        await retry.try(async () => {
          expect(await esClient.indices.exists({ index: indexName })).to.be(true);
        });
      }
    });

    it('should create new indices when agent policy is updated with new namespace', async () => {
      const namespace = Math.random().toString(32).substring(2);
      await updateAgentPolicy(kbnClient, testData.agentPolicy.id, { namespace }, true);

      for (const indexName of getExpectedIndexList(namespace)) {
        log.debug(`Checking that [${indexName}] exists`);
        await retry.try(async () => {
          expect(await esClient.indices.exists({ index: indexName })).to.be(true);
        });
      }
    });

    it('should NOT create indices when agent policy is updated if endpoint policy explicitly has a namespace defined', async () => {
      const namespace = Math.random().toString(32).substring(2);
      await updateIntegrationPolicy(kbnClient, testData.packagePolicy.id, { namespace }, true);

      for (const indexName of getExpectedIndexList(namespace)) {
        log.debug(`Checking that [${indexName}] exists`);
        await retry.try(async () => {
          expect(await esClient.indices.exists({ index: indexName })).to.be(true);
        });
      }

      // Now update agent policy with new namespace and check that indices are NOT created
      const namespace2 = Math.random().toString(32).substring(2);
      await updateAgentPolicy(kbnClient, testData.agentPolicy.id, { namespace: namespace2 }, true);

      // Delay just a few seconds to ensure policy index logic has executed
      await new Promise(async (resolve, reject) => {
        try {
          setTimeout(() => {
            resolve(undefined);
          }, 5000);
        } catch (error) {
          reject(error);
        }
      });

      for (const indexName of getExpectedIndexList(namespace2)) {
        log.debug(`Checking that [${indexName}] does NOT exists`);
        await retry.try(async () => {
          expect(await esClient.indices.exists({ index: indexName })).to.be(false);
        });
      }
    });
  });
}
