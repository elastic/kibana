/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  makeManagementApi,
  makeService,
  makeV2RulesClient,
  requestInSpace,
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

const requestA = requestInSpace('a');
const requestB = requestInSpace('b');

describe('maintenance across spaces', () => {
  it('pauses only the space it runs in', async () => {
    const { service, rules, soClient } = setupSpaces();

    const paused = await service.pause({ request: requestA });

    expect(paused.state).toBe('paused');
    expect(paused.rulesDisabled).toBe(1);
    expect(paused.partialFailures).toEqual([]);
    expect(rules.a.bulkDisableRules).toHaveBeenCalledWith({ ids: ['same-id'] });
    expect(rules.b.bulkDisableRules).not.toHaveBeenCalled();
    await expect(service.getState({ request: requestA })).resolves.toBe('paused');
    await expect(service.getState({ request: requestB })).resolves.toBe('enabled');
    // Space B never got a document of its own.
    expect(soClient.readDocument('a')).toEqual(expect.objectContaining({ state: 'paused' }));
    expect(soClient.readDocument('b')).toBeUndefined();
  });

  it('reports the status of the space it is asked about', async () => {
    const { service } = setupSpaces();
    await service.pause({ request: requestA, updatedBy: 'marco' });

    await expect(service.getStatus({ request: requestA })).resolves.toEqual(
      expect.objectContaining({ state: 'paused', updatedBy: 'marco' })
    );
    const statusB = await service.getStatus({ request: requestB });
    expect(statusB.state).toBe('enabled');
    expect(statusB.updatedBy).toBeUndefined();
  });

  it('resumes only the space it runs in', async () => {
    const { service, rules } = setupSpaces();
    await service.pause({ request: requestA });
    await service.pause({ request: requestB });

    const resumed = await service.resume({ request: requestB });

    expect(resumed.state).toBe('enabled');
    expect(resumed.partialFailures).toEqual([]);
    expect(rules.b.bulkEnableRules).toHaveBeenCalledWith({ ids: ['same-id'] });
    expect(rules.a.bulkEnableRules).not.toHaveBeenCalled();
    await expect(service.getState({ request: requestA })).resolves.toBe('paused');
    await expect(service.getState({ request: requestB })).resolves.toBe('enabled');
  });

  it('does not resume a space that was never paused', async () => {
    const { service, rules } = setupSpaces();
    await service.pause({ request: requestA });

    const resumed = await service.resume({ request: requestB });

    expect(resumed.state).toBe('enabled');
    expect(rules.a.bulkEnableRules).not.toHaveBeenCalled();
    expect(rules.b.bulkEnableRules).not.toHaveBeenCalled();
    await expect(service.getState({ request: requestA })).resolves.toBe('paused');
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
