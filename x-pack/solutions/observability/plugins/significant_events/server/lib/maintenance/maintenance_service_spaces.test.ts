/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  REQUEST,
  cleanupDocumentId,
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

// While the type was agnostic, one document listed the targets of every space. It is now the
// default space's document, so whatever it names for another space must not act on that space.
describe('a document written while the type was agnostic', () => {
  const agnosticDocument = {
    state: 'paused',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'marco',
    disabledWorkflows: [
      { id: cleanupDocumentId('default'), spaceId: 'default' },
      { id: cleanupDocumentId('space-a'), spaceId: 'space-a' },
      { id: SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID, spaceId: '*' },
    ],
    disabledRules: [
      { id: 'rule-default', spaceId: 'default' },
      { id: 'rule-a', spaceId: 'space-a' },
    ],
    pausedSettings: {
      continuousOnboardingWasEnabled: false,
      scheduledDiscoveryEnabledSpaceIds: ['default', 'space-a'],
    },
    lastSummary: {
      state: 'paused',
      executionsCancelled: 0,
      workflowsDisabled: 3,
      rulesDisabled: 2,
      partialFailures: [],
    },
  };

  const setup = async () => {
    const { api, updateWorkflow, getWorkflow, cancelAllActiveWorkflowExecutions } =
      makeManagementApi();
    const fixture = makeService({
      management: api,
      spaceIds: ['default', 'space-a'],
      ruleBackedRuleIds: ['rule-default'],
      scheduledDiscoveryEnabled: true,
    });
    fixture.soClient.seed('default', agnosticDocument);
    // The old pause really disabled every recorded workflow, so a wrong resume would show up.
    for (const { id, spaceId } of agnosticDocument.disabledWorkflows) {
      await api.updateWorkflow(id, { enabled: false }, spaceId);
    }
    updateWorkflow.mockClear();
    return { ...fixture, updateWorkflow, getWorkflow, cancelAllActiveWorkflowExecutions };
  };

  it('pauses the default space only, and does not give another space a document', async () => {
    const { service, soClient } = await setup();

    await expect(service.getState({ request: REQUEST })).resolves.toBe('paused');
    await expect(service.getState({ request: requestInSpace('space-a') })).resolves.toBe('enabled');
    expect(soClient.readDocument('space-a')).toBeUndefined();
  });

  it('resumes only the targets of its own space and drops the rest of the inventory', async () => {
    const { service, soClient, v2RulesClient, spaceUiSettingsClient, updateWorkflow, getWorkflow } =
      await setup();

    const summary = await service.resume({ request: REQUEST });

    expect(summary.state).toBe('enabled');
    expect(summary.partialFailures).toEqual([]);
    // Neither the other space's workflow nor the shared one is touched.
    expect(updateWorkflow.mock.calls.map(([id, patch]) => [id, patch.enabled])).toEqual([
      [cleanupDocumentId('default'), true],
    ]);
    expect(getWorkflow.mock.calls.every(([, spaceId]) => spaceId === 'default')).toBe(true);
    expect(v2RulesClient?.bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(v2RulesClient?.bulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-default'] });
    // The scheduled discovery toggle comes back for this space only.
    expect(spaceUiSettingsClient.set).toHaveBeenCalledTimes(1);
    expect(soClient.readDocument('default')).toEqual(
      expect.objectContaining({ state: 'enabled', disabledWorkflows: [], disabledRules: [] })
    );
    expect(soClient.readDocument('space-a')).toBeUndefined();
  });

  it('only writes the targets of its own space when it is paused again', async () => {
    const { service, soClient, updateWorkflow, cancelAllActiveWorkflowExecutions } = await setup();

    await service.pause({ request: REQUEST });

    expect(updateWorkflow.mock.calls.every(([, , spaceId]) => spaceId === 'default')).toBe(true);
    expect(
      cancelAllActiveWorkflowExecutions.mock.calls.every(([, spaceId]) => spaceId === 'default')
    ).toBe(true);
    const document = soClient.readDocument('default') as {
      disabledWorkflows: Array<{ spaceId: string }>;
      disabledRules: Array<{ id: string; spaceId: string }>;
      pausedSettings: { scheduledDiscoveryEnabledSpaceIds: string[] };
    };
    expect(document.disabledWorkflows.length).toBeGreaterThan(0);
    expect(document.disabledWorkflows.every(({ spaceId }) => spaceId === 'default')).toBe(true);
    expect(document.disabledRules).toEqual([{ id: 'rule-default', spaceId: 'default' }]);
    expect(document.pausedSettings.scheduledDiscoveryEnabledSpaceIds).toEqual(['default']);
  });
});
