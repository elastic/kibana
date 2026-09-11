/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { registerThreatIntelInferenceFeatures } from './inference_features';
import {
  THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
  THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
} from '../../common/threat_intel';

const createSetupMock = (result: { ok: boolean; error?: string } = { ok: true }) => {
  const register = jest.fn().mockReturnValue(result);
  return {
    setup: { features: { register } } as unknown as SearchInferenceEndpointsPluginSetup,
    register,
  };
};

describe('registerThreatIntelInferenceFeatures', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('registers exactly the enrich and Diamond features', () => {
    const { setup, register } = createSetupMock();

    registerThreatIntelInferenceFeatures(setup, logger);

    expect(register).toHaveBeenCalledTimes(2);
    expect(register.mock.calls.map(([arg]) => arg.featureId)).toEqual([
      THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
      THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
    ]);
  });

  it('registers the enrich feature on the cost-saving tier', () => {
    const { setup, register } = createSetupMock();

    registerThreatIntelInferenceFeatures(setup, logger);

    expect(register).toHaveBeenNthCalledWith(1, {
      parentFeatureId: 'security_search_inference_parent',
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      featureId: THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
      featureName: 'Threat Intelligence enrichment',
      featureDescription:
        'Model used to extract taxonomy, severity, and relevance from threat reports.',
      recommendedEndpoints: [
        '.anthropic-claude-4.5-haiku-chat_completion',
        defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
      ],
    });
  });

  it('registers the Diamond feature on the frontier tier', () => {
    const { setup, register } = createSetupMock();

    registerThreatIntelInferenceFeatures(setup, logger);

    expect(register).toHaveBeenNthCalledWith(2, {
      parentFeatureId: 'security_search_inference_parent',
      taskType: 'chat_completion',
      isTechPreview: true,
      ignoreGlobalDefault: true,
      featureId: THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
      featureName: 'Threat Intelligence Diamond extraction',
      featureDescription:
        'Model used to extract the Diamond Model adversary analysis from threat reports.',
      recommendedEndpoints: [
        defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_OPUS,
        defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
      ],
    });
  });

  // The two stages sit on deliberately different tiers. If the cluster-wide
  // default were allowed to win, both would collapse onto one model, losing the
  // cost saving on enrich and the reasoning quality on Diamond.
  it('opts both features out of the global default', () => {
    const { setup, register } = createSetupMock();

    registerThreatIntelInferenceFeatures(setup, logger);

    for (const [arg] of register.mock.calls) {
      expect(arg.ignoreGlobalDefault).toBe(true);
    }
  });

  // Enrich must not be recommended a model from the Diamond tier, or the
  // high-volume 4h path silently starts billing at frontier rates.
  it('keeps the enrich tier below the Diamond tier', () => {
    const { setup, register } = createSetupMock();

    registerThreatIntelInferenceFeatures(setup, logger);

    const [[enrich]] = register.mock.calls;
    expect(enrich.recommendedEndpoints).not.toContain(
      defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_OPUS
    );
  });

  it('is a no-op when the optional plugin is unavailable', () => {
    registerThreatIntelInferenceFeatures(undefined, logger);

    expect(logger.debug).toHaveBeenCalledWith(
      'searchInferenceEndpoints plugin not available, skipping threat intel inference feature registration'
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns per feature when registration is rejected', () => {
    const { setup } = createSetupMock({ ok: false, error: 'parent feature missing' });

    registerThreatIntelInferenceFeatures(setup, logger);

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to register inference feature "${THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID}": parent feature missing`
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to register inference feature "${THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID}": parent feature missing`
    );
  });

  it('registers both features even when the first is rejected', () => {
    const register = jest
      .fn()
      .mockReturnValueOnce({ ok: false, error: 'boom' })
      .mockReturnValueOnce({ ok: true });

    registerThreatIntelInferenceFeatures(
      { features: { register } } as unknown as SearchInferenceEndpointsPluginSetup,
      logger
    );

    expect(register).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
