/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { requestForSpace } from './feature_settings';
import {
  makeManagementApi,
  makeService,
  makeV2RulesClient,
  REQUEST,
} from './maintenance_service.test_helpers';

function setupSpaces() {
  const fixture = makeService({ management: makeManagementApi().api, spaceIds: ['a', 'b'] });
  const original = fixture.getScopedClients.getMockImplementation();
  if (!original) {
    throw new Error('Missing scoped client fixture');
  }
  fixture.streamDocuments.set('.significant_events-knowledge_indicators', 1);
  const rules = { a: makeV2RulesClient(), b: makeV2RulesClient() };
  fixture.getScopedClients.mockImplementation(async ({ request }: { request: KibanaRequest }) => {
    const clients = await original({ request });
    if (request.spaceId !== 'a' && request.spaceId !== 'b') {
      return clients;
    }
    const space = request.spaceId;
    const knowledge = await clients.getKnowledgeIndicatorClient();
    return {
      ...clients,
      getSignificantEventsAlertingContext: async () => ({
        alertingV2RulesClient: space === 'a' ? rules.a : rules.b,
      }),
      getKnowledgeIndicatorClient: async () => ({
        ...knowledge,
        getRuleBackedQueryLinks: jest.fn(async () => [{ rule_id: 'same-id', source_id: space }]),
        findSourceIdsWithOwnedRules: jest.fn(async () => [space]),
        findOwnedRuleIds: jest.fn(async (_sourceId: string) => ['same-id']),
      }),
    };
  });
  return { ...fixture, rules };
}

const requestA = requestForSpace(REQUEST, brandSpaceId('a'));
const requestB = requestForSpace(REQUEST, brandSpaceId('b'));

describe('maintenance across spaces', () => {
  it('pauses every space and resumes the recorded rules from another space', async () => {
    const { service, rules } = setupSpaces();
    const paused = await service.pause({ request: requestA });
    expect(paused.rulesDisabled).toBe(2);
    expect(paused.partialFailures).toEqual([]);
    expect(rules.a.bulkDisableRules).toHaveBeenCalledWith({ ids: ['same-id'] });
    expect(rules.b.bulkDisableRules).toHaveBeenCalledWith({ ids: ['same-id'] });

    const resumed = await service.resume({ request: requestB });
    expect(resumed.partialFailures).toEqual([]);
    expect(rules.a.bulkEnableRules).toHaveBeenCalledWith({ ids: ['same-id'] });
    expect(rules.b.bulkEnableRules).toHaveBeenCalledWith({ ids: ['same-id'] });
  });

  it('deletes owned rules in every space before resetting shared data', async () => {
    const { service, rules, esClient } = setupSpaces();
    await service.reset({ request: requestB });
    for (const client of Object.values(rules)) {
      expect(client.bulkDeleteRules).toHaveBeenCalledWith({ ids: ['same-id'] });
      expect(client.bulkDeleteRules.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.indices.deleteDataStream.mock.invocationCallOrder[0]
      );
    }
  });
});
