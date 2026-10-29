/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import { registerAlertZeroInferenceFeatures } from './inference_features';

const OPUS_5 = '.anthropic-claude-5-opus-chat_completion';
const SONNET_5 = '.anthropic-claude-5-sonnet-chat_completion';

const createSetupMock = (result: { ok: boolean; error?: string } = { ok: true }) => {
  const register = jest.fn().mockReturnValue(result);
  return {
    setup: { features: { register } } as unknown as SearchInferenceEndpointsPluginSetup,
    register,
  };
};

const registeredTier = (register: jest.Mock, featureId: string) =>
  register.mock.calls.map(([arg]) => arg).find((arg) => arg.featureId === featureId);

describe('registerAlertZeroInferenceFeatures', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  // Registration order is render order, so this also pins the rows to cheapest-first.
  it('registers the parent ahead of the three tiers and the template row', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(register.mock.calls.map(([arg]) => arg.featureId)).toEqual([
      ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
      ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
      ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
    ]);
  });

  // A list on the parent would become the silent default for any tier whose own
  // recommendations were cleared, which is the collapse the tiers exist to prevent.
  it('recommends nothing on the parent', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(registeredTier(register, ALERTZERO_INFERENCE_PARENT_FEATURE_ID)).toEqual({
      featureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      featureName: 'AlertZero',
      featureDescription:
        'AI models used by AlertZero Workers, grouped by the kind of call they make.',
      taskType: 'chat_completion',
      recommendedEndpoints: [],
      isTechPreview: true,
    });
  });

  it('registers the efficient tier on the cost-saving rung', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(registeredTier(register, ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID)).toEqual({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      featureId: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      featureName: 'Efficient models',
      featureDescription:
        'Quick, lightweight judgment on calls that run often, such as checking detection coverage. Choose a small, low-cost model.',
      recommendedEndpoints: [
        '.anthropic-claude-4.5-haiku-chat_completion',
        '.google-gemini-3.5-flash-lite-chat_completion',
        '.openai-gpt-5.6-luna-chat_completion',
      ],
    });
  });

  // Frequent or many-round calls multiply frontier latency and cost, so a mid-size model leads.
  it('registers the balanced tier on the mid-size rung', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(registeredTier(register, ALERTZERO_BALANCED_INFERENCE_FEATURE_ID)).toEqual({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      featureId: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
      featureName: 'Balanced models',
      featureDescription:
        'Calls where accuracy matters but that run often or use tools over many steps, such as triaging alerts or diagnosing a noisy rule. Choose a strong mid-size model.',
      recommendedEndpoints: [
        SONNET_5,
        '.openai-gpt-5.6-terra-chat_completion',
        '.google-gemini-3.6-flash-chat_completion',
      ],
    });
  });

  it('registers the frontier tier on the most capable rung', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(registeredTier(register, ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID)).toEqual({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      featureId: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
      featureName: 'Frontier models',
      featureDescription:
        'Complex, single-pass work where output quality matters most, such as generating attack discoveries or drafting a detection rule. Choose your most capable model.',
      recommendedEndpoints: [OPUS_5, '.openai-gpt-5.6-sol-chat_completion', SONNET_5],
    });
  });

  it('registers the prompt-template row with no recommended model', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(registeredTier(register, ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID)).toEqual({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      allowTemplateRequiredModels: true,
      featureId: ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
      featureName: 'Cyber domain models',
      featureDescription:
        'OpenAI Daybreak models for Attack Discovery, alert triage, the false-positive judge, and Hunt Watch. A Daybreak endpoint requires a prompt template, so it is listed only here. A model saved here replaces the tier those calls use. Leave this empty to keep Attack Discovery and the judge on Frontier models, alert triage on Efficient models, and Hunt dataset matching and recommendations on Efficient models with technique extraction on Frontier models. Hunt ES|QL generation keeps the Frontier model when the saved endpoint requires a prompt template.',
      recommendedEndpoints: [],
    });
  });

  // The tiers sit on deliberately different rungs. If the cluster-wide default were allowed to
  // win, all three would collapse onto one model, losing the cost saving on the efficient tier and
  // the quality on the frontier one.
  it('opts every tier out of the global default', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const tiers = register.mock.calls
      .map(([arg]) => arg)
      .filter((arg) => arg.featureId !== ALERTZERO_INFERENCE_PARENT_FEATURE_ID);

    expect(tiers.every((tier) => tier.ignoreGlobalDefault === true)).toBe(true);
  });

  // The efficient tier takes the highest-volume calls, so a mid-size or frontier recommendation
  // here silently bills the busiest path in AlertZero at those rates.
  it('keeps mid-size and frontier models out of the efficient tier', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const { recommendedEndpoints } = registeredTier(
      register,
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID
    );
    expect(recommendedEndpoints).not.toContain(OPUS_5);
    expect(recommendedEndpoints).not.toContain(SONNET_5);
  });

  it('is a no-op when the optional plugin is unavailable', () => {
    registerAlertZeroInferenceFeatures(undefined, logger);

    expect(logger.debug).toHaveBeenCalledWith(
      'searchInferenceEndpoints plugin not available, skipping AlertZero inference feature registration'
    );
  });

  it('warns per feature when registration is rejected', () => {
    const { setup } = createSetupMock({ ok: false, error: 'boom' });

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(logger.warn).toHaveBeenCalledTimes(5);
  });

  it('registers every tier even when the parent is rejected', () => {
    const register = jest
      .fn()
      .mockReturnValueOnce({ ok: false, error: 'boom' })
      .mockReturnValue({ ok: true });

    registerAlertZeroInferenceFeatures(
      { features: { register } } as unknown as SearchInferenceEndpointsPluginSetup,
      logger
    );

    expect(register).toHaveBeenCalledTimes(5);
  });
});
