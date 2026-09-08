/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-security';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
  type IndexedFleetEndpointPolicyResponse,
} from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  indexEndpointRuleAlerts,
  type IndexedEndpointRuleAlerts,
} from '../../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import type { LogsEndpointAction } from '../../../../../common/endpoint/types';

export const MISSING_ENTITY_ID_FIELD_ERROR =
  'The action was called with a non-existing event field name: entity_id';

export interface SeededAutomatedResponseActions {
  alertId: string;
  cleanup: () => Promise<void>;
}

interface ListQueryFields {
  type: 'INPUT_ACTION';
  data: { alert_id: string[] };
}

/**
 * Seeds an endpoint-rule alert, a Fleet endpoint policy (no live agent), and
 * three automated actions linked to that alert: isolate, kill-process, and a
 * suspend-process that failed because `entity_id` was missing on the event.
 *
 * GET action details space-filters on `agent.policy.integrationPolicyId`, so
 * the policy must be a real Fleet package policy. The flyout list query also
 * matches `type` + `data.alert_id` (same fields as Osquery / Fleet actions).
 */
export const seedAutomatedResponseActions = async ({
  esClient,
  kbnClient,
  log,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ScoutLogger;
}): Promise<SeededAutomatedResponseActions> => {
  const client = esClient as Client;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const endpointAgentId = `scout-ara-agent-${suffix}`;
  const endpointHostname = `scout-ara-host-${suffix}`;

  await setupFleetForEndpoint(kbnClient, log);

  const indexedPolicy: IndexedFleetEndpointPolicyResponse = await indexFleetEndpointPolicy(
    kbnClient,
    `Scout ARA ${suffix}`,
    undefined,
    undefined,
    log
  );
  const integrationPolicy = indexedPolicy.integrationPolicies[0];
  const agentPolicy = indexedPolicy.agentPolicies[0];
  if (!integrationPolicy || !agentPolicy) {
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexedPolicy);
    throw new Error('indexFleetEndpointPolicy did not return a policy');
  }
  const integrationPolicyId = integrationPolicy.id;
  const agentPolicyId = agentPolicy.id;

  const indexedAlerts: IndexedEndpointRuleAlerts = await indexEndpointRuleAlerts({
    esClient: client,
    kbnClient,
    endpointAgentId,
    endpointHostname,
    endpointIsolated: false,
    count: 1,
    log,
  });
  const alertId = indexedAlerts.alerts[0]._id;
  if (!alertId) {
    await indexedAlerts.cleanup();
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexedPolicy);
    throw new Error('indexEndpointRuleAlerts did not return an alert id');
  }

  let actionIds: string[] = [];

  try {
    const generator = new EndpointActionGenerator();
    const rule = { id: `scout-ara-rule-${suffix}`, name: `Scout ARA rule ${suffix}` };
    const actionAgentPolicy = {
      agentId: endpointAgentId,
      elasticAgentId: endpointAgentId,
      integrationPolicyId,
      agentPolicyId,
    };

    const generateAction = (
      command: ResponseActionsApiCommandNames,
      extras: Partial<LogsEndpointAction> = {}
    ): LogsEndpointAction & ListQueryFields => ({
      ...generator.generate({
        agent: {
          id: [endpointAgentId],
          policy: [actionAgentPolicy],
        },
        user: { id: 'unknown' },
        rule,
        originSpaceId: 'default',
        EndpointActions: {
          type: 'INPUT_ACTION',
          data: {
            command,
            comment: `${command} host`,
            alert_id: [alertId],
            hosts: { [endpointAgentId]: { name: endpointHostname } },
          },
        },
        ...extras,
      }),
      type: 'INPUT_ACTION',
      data: { alert_id: [alertId] },
    });

    const actions = [
      generateAction('isolate'),
      generateAction('kill-process'),
      generateAction('suspend-process', { error: { message: MISSING_ENTITY_ID_FIELD_ERROR } }),
    ];

    const bulkResponse = await client.bulk({
      refresh: 'wait_for',
      operations: actions.flatMap((action) => [
        { create: { _index: ENDPOINT_ACTIONS_INDEX } },
        action,
      ]),
    });

    if (bulkResponse.errors) {
      throw new Error(
        `Failed to index automated response actions: ${JSON.stringify(bulkResponse.items)}`
      );
    }

    actionIds = bulkResponse.items
      .map((item) => item.create?._id)
      .filter((id): id is string => Boolean(id));
  } catch (error) {
    await indexedAlerts.cleanup();
    await deleteIndexedFleetEndpointPolicies(kbnClient, indexedPolicy);
    throw error;
  }

  return {
    alertId,
    cleanup: async () => {
      if (actionIds.length) {
        await client
          .bulk({
            refresh: 'wait_for',
            operations: actionIds.map((id) => ({
              delete: { _index: ENDPOINT_ACTIONS_INDEX, _id: id },
            })),
          })
          .catch((error) => {
            log.warning(`action cleanup threw: ${error.message}`);
          });
      }
      await indexedAlerts.cleanup().catch((error) => {
        log.warning(`alert cleanup threw: ${error.message}`);
      });
      await deleteIndexedFleetEndpointPolicies(kbnClient, indexedPolicy).catch((error) => {
        log.warning(`policy cleanup threw: ${error.message}`);
      });
    },
  };
};
