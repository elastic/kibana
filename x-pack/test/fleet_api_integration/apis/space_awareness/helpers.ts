/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';

import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  AGENT_POLICY_INDEX,
  AGENTS_INDEX,
  type FleetServerAgent,
} from '@kbn/fleet-plugin/common';
import { ENROLLMENT_API_KEYS_INDEX } from '@kbn/fleet-plugin/common/constants';
import { asyncForEach } from '@kbn/std';

const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

export async function expectToRejectWithNotFound(fn: any) {
  await expectToRejectWithError(fn, /404 "Not Found"/);
}

export async function expectToRejectWithError(fn: any, errRegexp: RegExp) {
  let err: Error | undefined;
  try {
    await fn();
  } catch (_err) {
    err = _err;
  }
  expect(err).to.be.an(Error);
  expect(err?.message).to.match(errRegexp);
}

export async function cleanFleetIndices(esClient: Client) {
  await Promise.all([
    esClient.deleteByQuery({
      index: ENROLLMENT_API_KEYS_INDEX,
      q: '*',
      ignore_unavailable: true,
      refresh: true,
    }),
    esClient.deleteByQuery({
      index: AGENTS_INDEX,
      q: '*',
      ignore_unavailable: true,
      refresh: true,
    }),
  ]);
}

export async function cleanFleetAgents(esClient: Client) {
  await esClient.deleteByQuery({
    index: AGENTS_INDEX,
    q: '*',
    ignore_unavailable: true,
    refresh: true,
  });
}

export async function cleanFleetAgentPolicies(esClient: Client) {
  await esClient.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    q: '*',
    refresh: true,
  });
}

export async function cleanFleetActionIndices(esClient: Client) {
  try {
    await Promise.all([
      esClient.deleteByQuery({
        index: AGENT_ACTIONS_INDEX,
        q: '*',
        ignore_unavailable: true,
        refresh: true,
      }),
      esClient.deleteByQuery(
        {
          index: AGENT_ACTIONS_RESULTS_INDEX,
          q: '*',
          refresh: true,
        },
        ES_INDEX_OPTIONS
      ),
    ]);
  } catch (error) {
    // swallowing error if does not exist
  }
}

export async function createFleetAgent(esClient: Client, agentPolicyId: string, spaceId?: string) {
  const agentResponse = await esClient.index({
    index: '.fleet-agents',
    refresh: true,
    body: {
      access_api_key_id: 'api-key-3',
      active: true,
      policy_id: agentPolicyId,
      policy_revision_idx: 1,
      last_checkin_status: 'online',
      type: 'PERMANENT',
      local_metadata: {
        host: { hostname: 'host123' },
        elastic: { agent: { version: '8.15.0' } },
      },
      user_provided_metadata: {},
      enrolled_at: new Date().toISOString(),
      last_checkin: new Date().toISOString(),
      tags: ['tag1'],
      namespaces: spaceId ? [spaceId] : undefined,
    },
  });

  return agentResponse._id;
}

export async function getFleetAgentDoc(esClient: Client, agentId: string) {
  const agentResponse = await esClient.get<FleetServerAgent>({
    index: '.fleet-agents',
    id: agentId,
  });

  return agentResponse;
}

export async function makeAgentsUpgradeable(esClient: Client, agentIds: string[], version: string) {
  await asyncForEach(agentIds, async (agentId) => {
    await esClient.update({
      id: agentId,
      refresh: 'wait_for',
      index: AGENTS_INDEX,
      body: {
        doc: {
          local_metadata: { elastic: { agent: { upgradeable: true, version } } },
        },
      },
    });
  });
}
