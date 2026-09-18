/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import {
  ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
  ALERTZERO_FAST_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import { registerAlertZeroInferenceFeatures } from './inference_features';

const OPUS_5 = '.anthropic-claude-5-opus-chat_completion';

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
  it('registers the parent ahead of the three tiers', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(register.mock.calls.map(([arg]) => arg.featureId)).toEqual([
      ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      ALERTZERO_FAST_INFERENCE_FEATURE_ID,
      ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
      ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
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

  it('registers the fast tier on the cost-saving rung', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(registeredTier(register, ALERTZERO_FAST_INFERENCE_FEATURE_ID)).toEqual({
      parentFeatureId: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      featureId: ALERTZERO_FAST_INFERENCE_FEATURE_ID,
      featureName: 'Fast models',
      featureDescription:
        'Low latency, high volume, and lightweight judgment, such as triaging an alert or checking detection coverage.',
      recommendedEndpoints: [
        '.google-gemini-3.5-flash-lite-chat_completion',
        '.anthropic-claude-4.5-haiku-chat_completion',
        '.anthropic-claude-5-sonnet-chat_completion',
      ],
    });
  });

  it('registers the reasoning tier on the frontier rung', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(
      registeredTier(register, ALERTZERO_REASONING_INFERENCE_FEATURE_ID).recommendedEndpoints
    ).toEqual([
      OPUS_5,
      '.anthropic-claude-5-sonnet-chat_completion',
      '.openai-gpt-5.6-sol-chat_completion',
    ]);
  });

  // Many tool rounds multiply frontier latency and cost, so the mid-tier model leads.
  it('leads the agentic tier with the mid-tier model', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(
      registeredTier(register, ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID).recommendedEndpoints[0]
    ).toBe('.anthropic-claude-5-sonnet-chat_completion');
  });

  // The tiers sit on deliberately different rungs. If the cluster-wide default were allowed to
  // win, all three would collapse onto one model, losing the cost saving on the fast tier and the
  // quality on the reasoning one.
  it('opts every tier out of the global default', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    const tiers = register.mock.calls
      .map(([arg]) => arg)
      .filter((arg) => arg.featureId !== ALERTZERO_INFERENCE_PARENT_FEATURE_ID);

    expect(tiers.every((tier) => tier.ignoreGlobalDefault === true)).toBe(true);
  });

  // The fast tier runs once per alert, so a frontier recommendation here silently bills the
  // highest-volume path in AlertZero at frontier rates.
  it('keeps the frontier model out of the fast tier', () => {
    const { setup, register } = createSetupMock();

    registerAlertZeroInferenceFeatures(setup, logger);

    expect(
      registeredTier(register, ALERTZERO_FAST_INFERENCE_FEATURE_ID).recommendedEndpoints
    ).not.toContain(OPUS_5);
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

    expect(logger.warn).toHaveBeenCalledTimes(4);
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

    expect(register).toHaveBeenCalledTimes(4);
  });
});
