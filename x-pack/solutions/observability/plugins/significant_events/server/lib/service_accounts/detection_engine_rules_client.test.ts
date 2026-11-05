/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRulesManagementClient,
  SignificantEventsRuleDefinition,
} from '../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import { DetectionEngineRulesClient } from './detection_engine_rules_client';

const createRulesManagementClient = (): jest.Mocked<IRulesManagementClient> => ({
  createRule: jest.fn().mockResolvedValue(undefined),
  bulkCreateRules: jest.fn().mockResolvedValue({ createdIds: ['rule-1'] }),
  updateRule: jest.fn().mockResolvedValue(undefined),
  setRulesEnabled: jest.fn().mockResolvedValue(undefined),
  bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
  findRuleEnabledStates: jest.fn().mockResolvedValue(new Map()),
  findExistingRuleIds: jest.fn().mockResolvedValue([]),
  findOwnedRuleIds: jest.fn().mockResolvedValue([]),
  findSourceIdsWithOwnedRules: jest.fn().mockResolvedValue([]),
  findRuleIdsByTagPrefix: jest.fn().mockResolvedValue([]),
});

const definition = { name: 'Errors' } as unknown as SignificantEventsRuleDefinition;

describe('DetectionEngineRulesClient', () => {
  const setup = () => {
    const caller = createRulesManagementClient();
    const account = createRulesManagementClient();
    let accountRuns = 0;
    const client = new DetectionEngineRulesClient({
      caller,
      runAsAccount: async (fn) => {
        accountRuns += 1;
        return fn(account);
      },
    });
    return { client, caller, account, accountRuns: () => accountRuns };
  };

  it('creates, bulk creates, updates and enables rules as the account', async () => {
    const { client, caller, account } = setup();

    await client.createRule('rule-1', definition);
    await client.bulkCreateRules([{ id: 'rule-1', definition }]);
    await client.updateRule('rule-1', definition);
    await client.setRulesEnabled(['rule-1'], true);

    expect(account.createRule).toHaveBeenCalledWith('rule-1', definition);
    expect(account.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(account.updateRule).toHaveBeenCalledWith('rule-1', definition);
    expect(account.setRulesEnabled).toHaveBeenCalledWith(['rule-1'], true);
    expect(caller.createRule).not.toHaveBeenCalled();
    expect(caller.bulkCreateRules).not.toHaveBeenCalled();
    expect(caller.updateRule).not.toHaveBeenCalled();
    expect(caller.setRulesEnabled).not.toHaveBeenCalled();
  });

  it('disables and deletes rules as the caller, so turning rules off works without the account', async () => {
    const { client, caller, accountRuns } = setup();

    await client.setRulesEnabled(['rule-1'], false);
    await client.bulkDeleteRules(['rule-1']);

    expect(caller.setRulesEnabled).toHaveBeenCalledWith(['rule-1'], false);
    expect(caller.bulkDeleteRules).toHaveBeenCalledWith(['rule-1']);
    expect(accountRuns()).toBe(0);
  });

  it('reads rules as the caller', async () => {
    const { client, caller, accountRuns } = setup();

    await client.findRuleEnabledStates(['rule-1']);
    await client.findExistingRuleIds(['rule-1']);
    await client.findOwnedRuleIds('source-1');
    await client.findSourceIdsWithOwnedRules();

    expect(caller.findRuleEnabledStates).toHaveBeenCalledWith(['rule-1']);
    expect(caller.findExistingRuleIds).toHaveBeenCalledWith(['rule-1']);
    expect(caller.findOwnedRuleIds).toHaveBeenCalledWith('source-1');
    expect(caller.findSourceIdsWithOwnedRules).toHaveBeenCalledTimes(1);
    expect(accountRuns()).toBe(0);
  });

  it('does not create rules when the space is not set up', async () => {
    const caller = createRulesManagementClient();
    const client = new DetectionEngineRulesClient({
      caller,
      runAsAccount: async () => {
        throw new Error('Nightshift is not set up in this space');
      },
    });

    await expect(client.createRule('rule-1', definition)).rejects.toThrow('not set up');
    expect(caller.createRule).not.toHaveBeenCalled();
  });
});
