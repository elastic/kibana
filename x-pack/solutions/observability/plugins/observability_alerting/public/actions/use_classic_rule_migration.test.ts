/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { Capabilities } from '@kbn/core/public';
import type { EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { getMigrateClassicRulePrompt, useClassicRuleMigration } from './use_classic_rule_migration';

const createCapabilities = (showAgentBuilder: boolean): Capabilities => ({
  navLinks: {},
  management: {},
  catalogue: {},
  agentBuilder: { show: showAgentBuilder },
});

const createAgentBuilder = (
  access: EmbeddableChatAccess = { hasRequiredLicense: true, hasLlmConnector: true }
) => {
  const agentBuilder = agentBuilderMocks.createStart();
  agentBuilder.getAgentBuilderAccess.mockResolvedValue(access);
  return agentBuilder;
};

describe('getMigrateClassicRulePrompt', () => {
  it('references the migration skill and the rule id', () => {
    expect(getMigrateClassicRulePrompt('rule-1')).toBe(
      '[/classic-to-universal-rule-migration](skill://classic-to-universal-rule-migration) Migrate the classic rule with id rule-1 to a universal rule'
    );
  });
});

describe('useClassicRuleMigration', () => {
  it('opens a new conversation that runs the migration skill for the rule', async () => {
    const agentBuilder = createAgentBuilder();
    const { result } = renderHook(() =>
      useClassicRuleMigration({
        agentBuilder,
        capabilities: createCapabilities(true),
        canUseUniversalRules: true,
      })
    );

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.ruleTypeIds).toEqual([ES_QUERY_ID]);

    result.current?.onMigrate('rule-1');

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: getMigrateClassicRulePrompt('rule-1'),
      autoSendInitialMessage: true,
    });
  });

  it('returns undefined without the agentBuilder plugin', () => {
    const { result } = renderHook(() =>
      useClassicRuleMigration({
        capabilities: createCapabilities(true),
        canUseUniversalRules: true,
      })
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined without the Agent Builder capability', async () => {
    const agentBuilder = createAgentBuilder();
    const { result } = renderHook(() =>
      useClassicRuleMigration({
        agentBuilder,
        capabilities: createCapabilities(false),
        canUseUniversalRules: true,
      })
    );

    expect(result.current).toBeUndefined();
    expect(agentBuilder.getAgentBuilderAccess).not.toHaveBeenCalled();
  });

  it('returns undefined when the user cannot use universal rules', () => {
    const agentBuilder = createAgentBuilder();
    const { result } = renderHook(() =>
      useClassicRuleMigration({
        agentBuilder,
        capabilities: createCapabilities(true),
        canUseUniversalRules: false,
      })
    );

    expect(result.current).toBeUndefined();
    expect(agentBuilder.getAgentBuilderAccess).not.toHaveBeenCalled();
  });

  it.each([
    ['license', { hasRequiredLicense: false, hasLlmConnector: true }],
    ['LLM connector', { hasRequiredLicense: true, hasLlmConnector: false }],
  ])('returns undefined without the required %s', async (_reason, access) => {
    const agentBuilder = createAgentBuilder(access);
    const { result } = renderHook(() =>
      useClassicRuleMigration({
        agentBuilder,
        capabilities: createCapabilities(true),
        canUseUniversalRules: true,
      })
    );

    await waitFor(() => expect(agentBuilder.getAgentBuilderAccess).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });
});
