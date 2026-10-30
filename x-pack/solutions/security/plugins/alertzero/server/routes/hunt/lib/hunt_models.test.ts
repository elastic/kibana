/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import { mostSevereFailure, resolveHuntModels } from './hunt_models';
import { resolveConfiguredScopedModel, resolveScopedModel } from './scoped_model';

jest.mock('./scoped_model', () => ({
  resolveScopedModel: jest.fn(),
  resolveConfiguredScopedModel: jest.fn(),
}));

const resolveScopedModelMock = resolveScopedModel as jest.MockedFunction<typeof resolveScopedModel>;
const resolveConfiguredScopedModelMock = resolveConfiguredScopedModel as jest.MockedFunction<
  typeof resolveConfiguredScopedModel
>;

const logger = loggingSystemMock.createLogger();
const request = {} as KibanaRequest;
const uiSettingsClient = { get: jest.fn() } as never;
const inference = {} as never;

const modelFor = (featureId: string) =>
  ({ connector: { id: featureId } } as unknown as ScopedModel);

const resolve = (tiers?: Array<'efficient' | 'balanced' | 'frontier'>) =>
  resolveHuntModels({
    inference,
    telemetryPluginId: 'alertzero_hunt_sweep',
    request,
    uiSettingsClient,
    logger,
    tiers,
  });

describe('resolveHuntModels', () => {
  beforeEach(() => {
    resolveScopedModelMock
      .mockReset()
      .mockImplementation(async ({ featureId }) => ({ ok: true, model: modelFor(featureId) }));
    resolveConfiguredScopedModelMock.mockReset().mockResolvedValue(undefined);
  });

  it('resolves the tiers hunts use, each on its own feature id, by default', async () => {
    const { models, failures } = await resolve();

    expect(failures).toEqual([]);
    expect(models).toEqual({
      efficient: modelFor(ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID),
      frontier: modelFor(ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID),
    });
    expect(resolveScopedModelMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ featureId: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID })
    );
  });

  it('leaves the tiers on their own models when the cyber row is empty', async () => {
    const { models } = await resolve();

    expect(models.cyber).toBeUndefined();
    expect(resolveConfiguredScopedModelMock).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID })
    );
  });

  it('attaches a saved cyber-domain model without replacing the tier resolutions', async () => {
    const cyber = modelFor(ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID);
    resolveConfiguredScopedModelMock.mockResolvedValue(cyber);

    const { models, failures } = await resolve();

    expect(failures).toEqual([]);
    expect(models.cyber).toBe(cyber);
    expect(models.frontier).toEqual(modelFor(ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID));
    expect(models.efficient).toEqual(modelFor(ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID));
  });

  it('resolves only the tiers it is asked for', async () => {
    const { models } = await resolve(['frontier']);

    expect(Object.keys(models)).toEqual(['frontier']);
    expect(resolveScopedModelMock).toHaveBeenCalledTimes(1);
  });

  it('attributes every resolved tier model to the caller-provided telemetry plugin id', async () => {
    await resolve();

    expect(resolveScopedModelMock).toHaveBeenCalledTimes(2);
    for (const call of resolveScopedModelMock.mock.calls) {
      expect(call[0].chatModelOptions).toEqual({
        telemetryMetadata: {
          pluginId: 'alertzero_hunt_sweep',
          aggregateBy: ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
        },
      });
    }
  });

  it('leaves the other tiers intact when one has no usable connector', async () => {
    resolveScopedModelMock.mockImplementation(async ({ featureId }) =>
      featureId === ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID
        ? { ok: false, reason: 'no_connector', message: 'no efficient connector' }
        : { ok: true, model: modelFor(featureId) }
    );

    const { models, failures } = await resolve();

    expect(models).toEqual({
      frontier: modelFor(ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID),
    });
    expect(failures).toEqual([
      { tier: 'efficient', reason: 'no_connector', message: 'no efficient connector' },
    ]);
  });

  it('reports the failing tier and its reason when the inference plugin is absent', async () => {
    resolveScopedModelMock.mockResolvedValue({
      ok: false,
      reason: 'no_inference_plugin',
      message: 'inference is not installed',
    });

    const { models, failures } = await resolve(['frontier', 'balanced']);

    expect(models).toEqual({});
    expect(failures.map(({ tier, reason }) => ({ tier, reason }))).toEqual([
      { tier: 'frontier', reason: 'no_inference_plugin' },
      { tier: 'balanced', reason: 'no_inference_plugin' },
    ]);
  });

  it('reports a throwing resolution as a failure for that tier instead of rejecting', async () => {
    resolveScopedModelMock.mockImplementation(async ({ featureId }) => {
      if (featureId === ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID) {
        throw new Error('connector store unavailable');
      }
      return { ok: true, model: modelFor(featureId) };
    });

    const { models, failures } = await resolve();

    expect(models.efficient).toBeUndefined();
    expect(models.frontier).toBeDefined();
    expect(failures).toEqual([
      { tier: 'efficient', reason: 'resolution_error', message: 'connector store unavailable' },
    ]);
  });

  it('lists failures in the order the tiers were requested', async () => {
    resolveScopedModelMock.mockResolvedValue({ ok: false, reason: 'no_connector', message: 'x' });

    const { failures } = await resolve(['balanced', 'frontier']);

    expect(failures.map(({ tier }) => tier)).toEqual(['balanced', 'frontier']);
  });
});

describe('mostSevereFailure', () => {
  const failure = (
    tier: 'efficient' | 'balanced' | 'frontier',
    reason: 'no_inference_plugin' | 'no_connector' | 'resolution_error'
  ) => ({ tier, reason, message: `${tier} ${reason}` });

  it('puts a missing inference plugin ahead of a thrown resolution, and that ahead of a missing connector', () => {
    expect(
      mostSevereFailure([
        failure('balanced', 'no_connector'),
        failure('frontier', 'resolution_error'),
      ]).reason
    ).toBe('resolution_error');
    expect(
      mostSevereFailure([
        failure('balanced', 'resolution_error'),
        failure('frontier', 'no_inference_plugin'),
      ]).reason
    ).toBe('no_inference_plugin');
  });

  it('keeps the first of equally severe failures', () => {
    expect(
      mostSevereFailure([failure('balanced', 'no_connector'), failure('frontier', 'no_connector')])
        .tier
    ).toBe('balanced');
  });

  it('returns the only failure', () => {
    expect(mostSevereFailure([failure('frontier', 'no_connector')]).tier).toBe('frontier');
  });
});
