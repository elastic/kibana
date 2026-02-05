/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import expect from '@kbn/expect';
import type { IndexedHostsResponse } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_endpoint_hosts';
import {
  buildIndexHostsResponse,
  deleteIndexedEndpointHosts,
  indexEndpointHostForPolicy,
} from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_endpoint_hosts';
import { mergeAndAppendArrays } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import { indexFleetEndpointPolicy } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { enableFleetServerIfNecessary } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_server';
import {
  assignFleetAgentToNewPolicy,
  updateAgentPolicy,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import type TestAgent from 'supertest/lib/agent';
import type {
  ActionDetails,
  ActionListApiResponse,
  PromiseResolvedValue,
  ResponseActionApiResponse,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { addSpaceIdToPath, DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  ACTION_DETAILS_ROUTE,
  BASE_ENDPOINT_ACTION_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const policyTestResources = getService('endpointPolicyTestResources');
  const endpointTestResources = getService('endpointTestResources');
  const kbnServer = getService('kibanaServer');
  const esClient = getService('es');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/249464
  describe.skip('@ess @skipInServerless, @skipInServerlessMKI Response actions space awareness support', () => {
    const afterEachDataCleanup: Array<{ cleanup: () => Promise<void> }> = [];
    let counter = 1;
    let spaceOneId = '';
    let spaceTwoId = '';
    let adminSupertest: TestAgent;
    let testData: PromiseResolvedValue<ReturnType<typeof setupData>>;

    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    beforeEach(async () => {
      spaceOneId = `space_one_${counter++}`;
      spaceTwoId = `space_two_${counter++}`;

      await Promise.all([
        ensureSpaceIdExists(kbnServer, spaceOneId, { log }),
        ensureSpaceIdExists(kbnServer, spaceTwoId, { log }),
      ]);

      testData = await setupData();
      afterEachDataCleanup.push(testData);
    });

    afterEach(async () => {
      if (afterEachDataCleanup.length > 0) {
        await Promise.all(afterEachDataCleanup.map((data) => data.cleanup()));
        afterEachDataCleanup.length = 0;
      }
    });

    const setupData = async (): Promise<{
      /** data is set up so that it is only accessible from space one */
      spaceOne: IndexedHostsResponse;
      /** data is set up so that it is only accessible from space two */
      spaceTwo: IndexedHostsResponse;
      /** data is set up so that it includes agents from both spaces */
      shared: IndexedHostsResponse;
      cleanup: () => Promise<void>;
    }> => {
      const spaceOneKbnClient = endpointTestResources.getScopedKbnClient(spaceOneId);
      const spaceTwoKbnClient = endpointTestResources.getScopedKbnClient(spaceTwoId);
      const endpointPackage = await policyTestResources.getEndpointPackage();

      const indexDataIntoSpace = async (
        spaceId: string,
        name: string
      ): Promise<IndexedHostsResponse & { cleanup(): Promise<void> }> => {
        const spaceData: IndexedHostsResponse = buildIndexHostsResponse();
        const kbnClient = endpointTestResources.getScopedKbnClient(spaceId);
        await enableFleetServerIfNecessary(esClient, false, kbnClient, log);

        // Index Policies
        const policies = await indexFleetEndpointPolicy(
          kbnClient,
          `${spaceId} integration policy ${name}`,
          endpointPackage.version,
          `${spaceId} agent policy ${name}`,
          log,
          [spaceId]
        );

        mergeAndAppendArrays(spaceData, policies);

        // Index fleet agent and endpoint host metadata
        const host = await indexEndpointHostForPolicy({
          esClient,
          kbnClient,
          logger: log,
          integrationPolicyId: policies.integrationPolicies[0].id,
          overrides: {
            host: {
              name: `${spaceId} host ${name}`,
              hostname: `${spaceId} host ${name}`,
            },
          },
        });

        mergeAndAppendArrays(spaceData, host);
        log.info(`Data for space [${spaceId}] loaded`);

        return {
          ...spaceData,
          cleanup: async (): Promise<void> => {
            return deleteIndexedEndpointHosts(esClient, kbnClient, spaceData)
              .then((cleanupResponse) => {
                log.info(`Indexed test data for space [${spaceId}] was deleted`);
                log.verbose(
                  `Space [${spaceId}] data cleanup response:\n${JSON.stringify(
                    cleanupResponse,
                    null,
                    2
                  )}`
                );
              })
              .catch((e) => {
                log.error(
                  `Indexed data cleanup for space [${spaceId}] failed:\n${JSON.stringify(
                    e,
                    null,
                    2
                  )}`
                );
              });
          },
        };
      };

      const uniqueId = Math.random().toString(32);

      const spaceOne = await indexDataIntoSpace(spaceOneId, `1 - NOT SHARED (${uniqueId})`);
      const spaceTwo = await indexDataIntoSpace(spaceTwoId, `1 - NOT SHARED (${uniqueId})`);
      const shared = await indexDataIntoSpace(
        spaceOneId,
        `2 - SHARED WITH ${spaceTwoId} (${uniqueId})`
      );

      // Make sure the shared policy is shared with space two
      await updateAgentPolicy(
        spaceOneKbnClient,
        shared.agentPolicies[0].id,
        { space_ids: [spaceOneId, spaceTwoId] },
        true
      );

      // Add a new endpoint/agent to spaceTwo under the same shared policy.
      const sharedIntegrationPolicy = shared.integrationPolicies[0];
      const spaceTwoSharedEndpointHost = await indexEndpointHostForPolicy({
        esClient,
        kbnClient: spaceTwoKbnClient,
        integrationPolicyId: sharedIntegrationPolicy.id,
        overrides: {
          host: {
            name: `${spaceTwoId} host 2 on shared policy (${uniqueId})`,
            hostname: `${spaceTwoId} host 2 on shared policy (${uniqueId})`,
          },
        },
        logger: log,
      });

      await endpointTestResources.waitForUnitedEndpoints([
        spaceTwoSharedEndpointHost.hosts[0].agent.id,
      ]);

      mergeAndAppendArrays(spaceTwo, spaceTwoSharedEndpointHost);

      const cleanup = async (): Promise<void> => {
        await Promise.all([spaceOne.cleanup(), spaceTwo.cleanup(), shared.cleanup()]);
      };

      return {
        spaceOne,
        spaceTwo,
        shared,
        cleanup,
      };
    };

    const setupResponseActions = async (): Promise<{
      // 1 Action against a host that is ONLY accessible in space one
      spaceOneAction: ActionDetails;
      // 1 Action against two hosts:
      //    - one from space two that is part of a shared policy, and
      //    - one from space two that is NOT shared
      spaceTwoAction: ActionDetails;
    }> => {
      // Add response action to space one only host
      const { body: spaceOneActionResponse } = await adminSupertest
        .post(addSpaceIdToPath('/', spaceOneId, ISOLATE_HOST_ROUTE_V2))
        .set('elastic-api-version', '2023-10-31')
        .set('x-elastic-internal-origin', 'kibana')
        .set('kbn-xsrf', 'true')
        .on('error', createSupertestErrorLogger(log))
        .send({
          agent_type: 'endpoint',
          endpoint_ids: [testData.spaceOne.hosts[0].agent.id],
        })
        .expect(200);

      const spaceOneAction = (spaceOneActionResponse as ResponseActionApiResponse).data;

      // add response action to space two shared host and space one shared host
      const { body: spaceTwoActionResponse } = await adminSupertest
        .post(addSpaceIdToPath('/', spaceTwoId, ISOLATE_HOST_ROUTE_V2))
        .set('elastic-api-version', '2023-10-31')
        .set('x-elastic-internal-origin', 'kibana')
        .set('kbn-xsrf', 'true')
        .on('error', createSupertestErrorLogger(log))
        .send({
          agent_type: 'endpoint',
          endpoint_ids: [testData.spaceTwo.hosts[0].agent.id, testData.spaceTwo.hosts[1].agent.id],
        })
        .expect(200);

      const spaceTwoAction = (spaceTwoActionResponse as ResponseActionApiResponse).data;

      return {
        spaceOneAction,
        spaceTwoAction,
      };
    };

    describe('when creating actions', () => {
      it('should create action if all agent ids are accessible in active space', async () => {
        await adminSupertest
          .post(addSpaceIdToPath('/', spaceOneId, ISOLATE_HOST_ROUTE_V2))
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .send({
            agent_type: 'endpoint',
            endpoint_ids: [
              testData.spaceOne.hosts[0].agent.id,
              // Second host on space 2 is on shared policy with space one
              testData.spaceTwo.hosts[1].agent.id,
            ],
          })
          .expect(200);
      });

      it('should error if at least one agent is not accessible in active space', async () => {
        await adminSupertest
          .post(addSpaceIdToPath('/', spaceOneId, ISOLATE_HOST_ROUTE_V2))
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .send({
            agent_type: 'endpoint',
            endpoint_ids: [
              testData.spaceOne.hosts[0].agent.id,
              // The first host on space two is not shared, so this should trigger error
              testData.spaceTwo.hosts[0].agent.id,
            ],
          })
          .expect(404);
      });
    });

    describe('and for action history log APIs', () => {
      // Action against a host that is ONLY accessible in space one
      let spaceOneAction: ActionDetails;
      // Action against two hosts:
      //    - one from space two that is part of a shared policy, and
      //    - one from space two that is part of a policy only accessible in space two
      let spaceTwoAction: ActionDetails;

      beforeEach(async () => {
        ({ spaceOneAction, spaceTwoAction } = await setupResponseActions());
      });

      describe('when fetching list of actions', () => {
        it('should return all actions sent to agents that are accessible in active space', async () => {
          const { body: spaceOneActionListResponse } = await adminSupertest
            .get(addSpaceIdToPath('/', spaceOneId, BASE_ENDPOINT_ACTION_ROUTE))
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send()
            .expect(200);

          expect((spaceOneActionListResponse as ActionListApiResponse).total).to.equal(2);

          // Space two should only have 1 action (on the shared host)
          const { body: spaceTwoActionListResponse } = await adminSupertest
            .get(addSpaceIdToPath('/', spaceTwoId, BASE_ENDPOINT_ACTION_ROUTE))
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send()
            .expect(200);

          expect((spaceTwoActionListResponse as ActionListApiResponse).total).to.equal(1);
        });

        it('should return empty results for space with no endpoint hosts', async () => {
          const { body: actionListResult } = await adminSupertest
            .get(addSpaceIdToPath('/', DEFAULT_SPACE_ID, BASE_ENDPOINT_ACTION_ROUTE))
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send()
            .expect(200);

          expect((actionListResult as ActionListApiResponse).total).to.equal(0);
        });
      });

      describe('when fetching single action', () => {
        it('should return action if at least 1 agent is accessible in active space', async () => {
          await adminSupertest
            .get(
              addSpaceIdToPath(
                '/',
                spaceOneId,
                ACTION_DETAILS_ROUTE.replace('{action_id}', spaceOneAction.id)
              )
            )
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send()
            .expect(200);

          await adminSupertest
            .get(
              addSpaceIdToPath(
                '/',
                spaceOneId,
                // Action taken on host from space two should also be accessible since its on a shared policy
                ACTION_DETAILS_ROUTE.replace('{action_id}', spaceTwoAction.id)
              )
            )
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send()
            .expect(200);
        });

        it('should error if none of the agents are accessible in active space', async () => {
          await adminSupertest
            .get(
              addSpaceIdToPath(
                '/',
                DEFAULT_SPACE_ID,
                ACTION_DETAILS_ROUTE.replace('{action_id}', spaceOneAction.id)
              )
            )
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send()
            .expect(404);
        });
      });
    });

    describe('and when a host/agent moves from a shared policy to a single-space policy', () => {
      // Action against a host that is ONLY accessible in space one
      let spaceOneAction: ActionDetails;
      // Action against two hosts:
      //    - one from space two that is part of a shared policy, and
      //    - one from space two that is part of a policy only accessible in space two
      let spaceTwoAction: ActionDetails;

      beforeEach(async () => {
        ({ spaceOneAction, spaceTwoAction } = await setupResponseActions());

        // Move the Space Two **shared** host/agent to the policy that is ONLY accessible in Space two
        await assignFleetAgentToNewPolicy({
          esClient,
          kbnClient: endpointTestResources.getScopedKbnClient(spaceTwoId),
          agentId: testData.spaceTwo.hosts[1].agent.id,
          newAgentPolicyId: testData.spaceTwo.agentPolicies[0].id,
        });
      });

      it('should return previously sent response action that included agent from space one on action list api response', async () => {
        // From space two:
        // Both actions should still be visible - one was sent to two agents, and one of them was previously attached
        // to a shared policy from space one.
        const { body: spaceTwoActionListResponse } = await adminSupertest
          .get(addSpaceIdToPath('/', spaceTwoId, BASE_ENDPOINT_ACTION_ROUTE))
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        log.verbose(
          `List response from space two:\n${JSON.stringify(spaceTwoActionListResponse, null, 2)}`
        );

        expect((spaceTwoActionListResponse as ActionListApiResponse).total).to.equal(1);
        expect((spaceTwoActionListResponse as ActionListApiResponse).data[0].id).to.equal(
          spaceTwoAction.id
        );

        // from space one: the response action that was sent to hosts from both space one and two due
        // to the prior sharing of the same policy should still be accessible in space one after the host
        // from space two was moved to a private policy
        const { body: spaceOneActionListResponse } = await adminSupertest
          .get(addSpaceIdToPath('/', spaceOneId, BASE_ENDPOINT_ACTION_ROUTE))
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        log.verbose(
          `List response from space one:\n${JSON.stringify(spaceOneActionListResponse, null, 2)}`
        );

        expect((spaceOneActionListResponse as ActionListApiResponse).total).to.equal(2);
        expect((spaceOneActionListResponse as ActionListApiResponse).data[0].id).to.equal(
          spaceTwoAction.id
        );
        expect((spaceOneActionListResponse as ActionListApiResponse).data[1].id).to.equal(
          spaceOneAction.id
        );
      });

      it('should return details for an action that was previously sent when host was on a shared policy when calling action details api ', async () => {
        // space one
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              spaceOneId,
              // Action taken on host from space two should also be accessible since its on a shared policy
              ACTION_DETAILS_ROUTE.replace('{action_id}', spaceTwoAction.id)
            )
          )
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        // Space two
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              spaceTwoId,
              // Action taken on host from space two should also be accessible since its on a shared policy
              ACTION_DETAILS_ROUTE.replace('{action_id}', spaceTwoAction.id)
            )
          )
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);
      });
    });
  });
}
