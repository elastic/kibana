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

const OPUS_5_5 = '.anthropic-claude-5.5-opus-chat_completion';
const SONNET_5 = '.anthropic-claude-5-sonnet-chat_completion';
const SONNET_5_5 = '.anthropic-claude-5.5-sonnet-chat_completion';
const GPT_6_SOL = '.openai-gpt-6-sol-chat_completion';
const GPT_6_LUNA = '.openai-gpt-6-luna-chat_completion';
const GLM_5_2 = '.zai-glm-5-2-chat_completion';
const KIMI_K3 = '.moonshot-kimi-k3-chat_completion';

// Chat-completion endpoints the Serverless trial EIS catalog serves. It serves none of the other
// recommendations, so without these every tier falls through to the same catalog entry.
const TRIAL_CATALOG_CHAT_ENDPOINTS = [
  SONNET_5,
  KIMI_K3,
  '.nvidia-nemotron-3.5-super-vl-chat_completion',
  '.qwen-3.8-2.4t-a95b-chat_completion',
  '.zai-glm-5.3-chat_completion',
  '.zai-glm-5-2-chat_completion',
];

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

  it('registers the efficient tier', () => {
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
        'Calls that run on every alert sweep, such as triaging alerts and checking detection coverage. A triage verdict can lead to a close proposal, so choose a model that stays accurate at volume.',
      recommendedEndpoints: [GPT_6_SOL, SONNET_5_5, GLM_5_2],
    });
  });

  it('registers the balanced tier', () => {
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
        'Calls that use tools over many steps, such as diagnosing a noisy rule or analyzing endpoint forensics. Choose a model that is strong at multi-step tool use.',
      recommendedEndpoints: [SONNET_5_5, GPT_6_SOL, SONNET_5],
    });
  });

  it('registers the frontier tier', () => {
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
      recommendedEndpoints: [GPT_6_SOL, OPUS_5_5, KIMI_K3],
    });
  });

  // Every tier lists at least two vendors, so losing one vendor still leaves a model on the same
  // rung instead of falling through to the parent.
  it('spans at least two vendors in every tier', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const tierIds = [
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
      ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
    ];
    for (const tierId of tierIds) {
      const { recommendedEndpoints } = registeredTier(register, tierId);
      const vendors = new Set(
        recommendedEndpoints.map((endpoint: string) => endpoint.split('-')[0])
      );
      expect(vendors.size).toBeGreaterThanOrEqual(2);
    }
  });

  // Sonnet 5 is trial-served, but it matched the gold verdict on far fewer Attack Discovery Worker
  // runs than Kimi K3, so a trial cluster must not resolve the frontier tier to it.
  it('keeps Claude Sonnet 5 out of the frontier tier', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const { recommendedEndpoints } = registeredTier(
      register,
      ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID
    );
    expect(recommendedEndpoints).not.toContain(SONNET_5);
  });

  it('falls back to the strongest trial-served model on every tier', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const trialServed = [
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
      ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
    ].map((tierId) =>
      registeredTier(register, tierId).recommendedEndpoints.find((endpoint: string) =>
        TRIAL_CATALOG_CHAT_ENDPOINTS.includes(endpoint)
      )
    );

    expect(trialServed).toEqual([GLM_5_2, SONNET_5, KIMI_K3]);
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

  // Otherwise the cluster-wide default would replace lists picked from each tier's own evals.
  it('opts every tier out of the global default', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const tiers = register.mock.calls
      .map(([arg]) => arg)
      .filter((arg) => arg.featureId !== ALERTZERO_INFERENCE_PARENT_FEATURE_ID);

    expect(tiers.every((tier) => tier.ignoreGlobalDefault === true)).toBe(true);
  });

  // Alert triage runs on the efficient tier, and GPT-6 Luna lost about one verdict in five on the
  // triage evals. A wrong verdict can become a close proposal, so it must not be recommended here.
  it('keeps GPT-6 Luna out of the efficient tier', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const { recommendedEndpoints } = registeredTier(
      register,
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID
    );
    expect(recommendedEndpoints).not.toContain(GPT_6_LUNA);
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
