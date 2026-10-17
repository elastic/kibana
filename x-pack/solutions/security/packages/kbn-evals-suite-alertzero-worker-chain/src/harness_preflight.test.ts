/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  ALERTZERO_AGENTIC_FEATURE_ID,
  ALERTZERO_REASONING_FEATURE_ID,
  INFERENCE_SETTINGS_ROUTE,
  SKILLS_URL,
} from './constants';
import {
  assertInvestigateRuleSkillRegistered,
  bindWorkerChainInferenceFeatures,
} from './harness_preflight';

describe('assertInvestigateRuleSkillRegistered (B1)', () => {
  const skillsFetch = (ids: string[]) =>
    jest.fn(async () => ({ results: ids.map((id) => ({ id })) })) as unknown as HttpHandler;

  it('passes when investigate-rule is listed', async () => {
    const fetch = skillsFetch(['alert-triage', 'investigate-rule']);
    await expect(assertInvestigateRuleSkillRegistered(fetch)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(SKILLS_URL, expect.objectContaining({ method: 'GET' }));
  });

  it('hard-fails when the skill is absent, naming the config set to use', async () => {
    await expect(
      assertInvestigateRuleSkillRegistered(skillsFetch(['alert-triage']))
    ).rejects.toThrow(/investigate-rule.*not registered.*evals_alertzero_worker_chain/s);
  });

  it('hard-fails on an empty or malformed skills response', async () => {
    await expect(assertInvestigateRuleSkillRegistered(skillsFetch([]))).rejects.toThrow(
      'not registered'
    );
    const malformed = jest.fn(async () => ({})) as unknown as HttpHandler;
    await expect(assertInvestigateRuleSkillRegistered(malformed)).rejects.toThrow('not registered');
  });
});

describe('bindWorkerChainInferenceFeatures (S1)', () => {
  const makeSettings = () => {
    let features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }> = [
      { feature_id: 'unrelated', endpoints: [{ id: 'keep-me' }] },
      { feature_id: ALERTZERO_AGENTIC_FEATURE_ID, endpoints: [{ id: 'stack-default' }] },
    ];
    const initial = JSON.stringify(features);
    const fetch = jest.fn(async (path: string, options?: { method?: string; body?: string }) => {
      if (path !== INFERENCE_SETTINGS_ROUTE) throw new Error(`unexpected ${path}`);
      if (options?.method === 'PUT') {
        features = JSON.parse(options.body ?? '{}').features;
        return {};
      }
      return { data: { features } };
    });
    return {
      fetch: fetch as unknown as HttpHandler,
      endpointFor: (id: string) => features.find((f) => f.feature_id === id)?.endpoints[0]?.id,
      initial,
      current: () => JSON.stringify(features),
    };
  };

  it('binds both alertzero_reasoning and alertzero_agentic to the candidate, keeping other features', async () => {
    const settings = makeSettings();
    await bindWorkerChainInferenceFeatures(settings.fetch, 'candidate');
    expect(settings.endpointFor(ALERTZERO_REASONING_FEATURE_ID)).toBe('candidate');
    expect(settings.endpointFor(ALERTZERO_AGENTIC_FEATURE_ID)).toBe('candidate');
    expect(settings.endpointFor('unrelated')).toBe('keep-me');
  });

  it('puts the previous settings back', async () => {
    const settings = makeSettings();
    const restore = await bindWorkerChainInferenceFeatures(settings.fetch, 'candidate');
    await restore();
    expect(settings.current()).toBe(settings.initial);
  });
});
