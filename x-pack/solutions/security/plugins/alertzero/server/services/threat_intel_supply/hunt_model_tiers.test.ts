/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import { evaluateHuntModelTiers } from './hunt_model_tiers';

const request = {} as KibanaRequest;
const logger = loggingSystemMock.createLogger();

const connector = (connectorId: string, isRecommended?: boolean) => ({
  connectorId,
  ...(isRecommended === undefined ? {} : { isRecommended }),
});

/** What the registry's default-mode list returns for a tier. */
const PICKED = { endpoints: [connector('mine')], soEntryFound: true };
const RECOMMENDED = {
  endpoints: [connector('opus', true), connector('other')],
  soEntryFound: false,
};
const CATALOG = {
  endpoints: [connector('platform-default'), connector('other')],
  soEntryFound: false,
};
const NOTHING = { endpoints: [], soEntryFound: false };
const PICK_GONE = { endpoints: [], soEntryFound: true };

const registry = (
  byFeature: Record<string, unknown | Error>
): SearchInferenceEndpointsPluginStart => {
  const getForFeature = jest.fn(async (featureId: string) => {
    const result = byFeature[featureId];
    if (result instanceof Error) throw result;
    return result;
  });
  return { endpoints: { getForFeature } } as unknown as SearchInferenceEndpointsPluginStart;
};

const allTiers = (result: unknown | Error): Record<string, unknown | Error> => ({
  [ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID]: result,
  [ALERTZERO_BALANCED_INFERENCE_FEATURE_ID]: result,
  [ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID]: result,
});

/**
 * The deployment defaults. `existing` is the set of connector ids the inference plugin can fetch;
 * a `genAi:defaultAIConnector` setting naming anything else is stale.
 */
const deployment = ({
  genAiDefault,
  inferenceDefault,
  existing = [genAiDefault, inferenceDefault].filter((id): id is string => Boolean(id)),
}: { genAiDefault?: string; inferenceDefault?: string; existing?: string[] } = {}) => ({
  inference: {
    getDefaultConnector: jest
      .fn()
      .mockResolvedValue(inferenceDefault ? { connectorId: inferenceDefault } : undefined),
    getConnectorById: jest.fn(async (id: string) => {
      if (!existing.includes(id)) throw new Error(`connector ${id} not found`);
      return { connectorId: id };
    }),
  } as never,
  uiSettingsClient: { get: jest.fn().mockResolvedValue(genAiDefault) } as never,
});

const states = async (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined,
  defaults: { inference: unknown; uiSettingsClient: unknown }
) =>
  (
    await evaluateHuntModelTiers({
      ...defaults,
      searchInferenceEndpoints,
      request,
      logger,
    } as never)
  ).map(({ state }) => state);

// One per tier Hunt runs on: Efficient and Frontier. Balanced is registered but has no hunt consumer.
const everyTier = (state: string) => [state, state];

describe('evaluateHuntModelTiers', () => {
  it('reports every tier in tier order, each on its own feature id, from one registry read each', async () => {
    const searchInferenceEndpoints = registry(allTiers(RECOMMENDED));

    const tiers = await evaluateHuntModelTiers({
      ...deployment(),
      searchInferenceEndpoints,
      request,
      logger,
    } as never);

    expect(tiers.map(({ tier }) => tier)).toEqual(['efficient', 'frontier']);
    const calls = (searchInferenceEndpoints.endpoints.getForFeature as jest.Mock).mock.calls;
    expect(calls.map(([featureId]) => featureId).sort()).toEqual(
      [ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID, ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID].sort()
    );
    // Balanced is not a hunt tier, so its model is not Hunt supply.
    expect(calls.map(([featureId]) => featureId)).not.toContain(
      ALERTZERO_BALANCED_INFERENCE_FEATURE_ID
    );
    // Default mode, the same read Hunt makes: no `onlyReturnConfigured`.
    expect(calls.every(([, , opts]) => opts === undefined)).toBe(true);
  });

  it('does not read the deployment defaults for a tier that already has a model', async () => {
    const defaults = deployment({ genAiDefault: 'my-default' });

    await states(registry(allTiers(PICKED)), defaults);

    expect((defaults.uiSettingsClient as { get: jest.Mock }).get).not.toHaveBeenCalled();
  });

  describe('when the tier has a model in its own list', () => {
    it('reports an operator pick as configured', async () => {
      expect(await states(registry(allTiers(PICKED)), deployment())).toEqual(
        everyTier('configured')
      );
    });

    it('reports a provisioned recommendation as recommended', async () => {
      expect(await states(registry(allTiers(RECOMMENDED)), deployment())).toEqual(
        everyTier('recommended')
      );
    });

    it('reports the catalog, platform default first, as default_fallback', async () => {
      expect(await states(registry(allTiers(CATALOG)), deployment())).toEqual(
        everyTier('default_fallback')
      );
    });

    it('reports the default connector of a deployment set to use it exclusively as default_fallback', async () => {
      const onlyDefault = { endpoints: [connector('only-default')], soEntryFound: false };
      expect(await states(registry(allTiers(onlyDefault)), deployment())).toEqual(
        everyTier('default_fallback')
      );
    });
  });

  describe('when the tier has nothing in its own list', () => {
    it('runs on the operator default connector when it exists', async () => {
      expect(
        await states(registry(allTiers(NOTHING)), deployment({ genAiDefault: 'my-default' }))
      ).toEqual(everyTier('default_fallback'));
    });

    it('runs on the inference default when there is no operator default', async () => {
      expect(
        await states(registry(allTiers(NOTHING)), deployment({ inferenceDefault: 'inf-default' }))
      ).toEqual(everyTier('default_fallback'));
    });

    it('is unavailable when no connector exists anywhere', async () => {
      expect(await states(registry(allTiers(NOTHING)), deployment())).toEqual(
        everyTier('unavailable')
      );
    });

    it('is unavailable when the operator default names a connector that was deleted', async () => {
      // The setting still holds the old id. Hunt cannot build it and skips Tier 2, so the status
      // must not read a default as present.
      expect(
        await states(
          registry(allTiers(NOTHING)),
          deployment({ genAiDefault: 'deleted-connector', existing: [] })
        )
      ).toEqual(everyTier('unavailable'));
    });

    it('skips a deleted operator default and runs on the inference default', async () => {
      expect(
        await states(
          registry(allTiers(NOTHING)),
          deployment({
            genAiDefault: 'deleted-connector',
            inferenceDefault: 'inf-default',
            existing: ['inf-default'],
          })
        )
      ).toEqual(everyTier('default_fallback'));
    });
  });

  describe('when the operator picked models that no longer exist', () => {
    // The registry drops missing ids but still reports the saved entry: an empty list with
    // soEntryFound set. A plain "empty means unavailable" gets this wrong.
    it('reports configured_missing while Hunt runs on a deployment default', async () => {
      expect(
        await states(registry(allTiers(PICK_GONE)), deployment({ genAiDefault: 'my-default' }))
      ).toEqual(everyTier('configured_missing'));
    });

    it('reports unavailable when there is no deployment default to run on either', async () => {
      expect(await states(registry(allTiers(PICK_GONE)), deployment())).toEqual(
        everyTier('unavailable')
      );
    });

    it('reports unavailable when the only deployment default is itself deleted', async () => {
      expect(
        await states(
          registry(allTiers(PICK_GONE)),
          deployment({ genAiDefault: 'deleted-connector', existing: [] })
        )
      ).toEqual(everyTier('unavailable'));
    });
  });

  it('treats a failed registry read as an empty list, as Hunt does', async () => {
    const searchInferenceEndpoints = registry(allTiers(new Error('saved object read failed')));

    expect(
      await states(searchInferenceEndpoints, deployment({ genAiDefault: 'my-default' }))
    ).toEqual(everyTier('default_fallback'));
    expect(await states(searchInferenceEndpoints, deployment())).toEqual(everyTier('unavailable'));
    // Worded for a settings-page request, not as though a hunt had fallen through.
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[hunt:readiness]'));
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('falling through'));
  });

  it('reads each tier independently', async () => {
    const searchInferenceEndpoints = registry({
      [ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID]: RECOMMENDED,
      [ALERTZERO_BALANCED_INFERENCE_FEATURE_ID]: NOTHING,
      [ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID]: PICKED,
    });

    expect(await states(searchInferenceEndpoints, deployment())).toEqual([
      'recommended',
      'configured',
    ]);
  });

  it('falls back to the deployment defaults without the model-tier registry, as Hunt does', async () => {
    expect(await states(undefined, deployment({ genAiDefault: 'my-default' }))).toEqual(
      everyTier('default_fallback')
    );
    expect(await states(undefined, deployment())).toEqual(everyTier('unavailable'));
  });

  it('reports every tier unavailable without the inference plugin, whatever the registry says', async () => {
    expect(
      await states(registry(allTiers(RECOMMENDED)), {
        inference: undefined,
        uiSettingsClient: { get: jest.fn() },
      })
    ).toEqual(everyTier('unavailable'));
  });
});
