/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import {
  HUNT_TIER_FEATURE_IDS,
  assertTierPinned,
  assertTierRegistered,
  evaluate,
} from './evaluate';

const INFERENCE_SETTINGS_URL = '/internal/search_inference_endpoints/settings';
const INFERENCE_FEATURES_URL = '/internal/search_inference_endpoints/features';

const log = {
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
} as unknown as ToolingLog;

// `@kbn/evals` needs a full Playwright runtime; replace `extend` with an
// identity capture so the raw fixture definitions of this suite are reachable.
jest.mock('@kbn/evals', () => ({
  evaluate: { extend: (fixtures: unknown) => fixtures },
}));

type FixtureFn = (
  deps: { kbnClient: KbnClient; connector: { id: string }; log: ToolingLog },
  use: () => Promise<void>
) => Promise<void>;

/** The worker-scoped, auto `modelSettingsForHuntWatch` fixture: `[fn, options]`. */
const modelSettingsFixture = (): FixtureFn =>
  (evaluate as unknown as Record<string, [FixtureFn, unknown]>).modelSettingsForHuntWatch[0];

interface Feature {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

interface PutBody {
  method: string;
  path: string;
  body: { features: Feature[] };
}

/** Stateful stand-in for the settings saved object: PUT replaces it, GET reads it back. */
const makeKbnClient = ({
  previousTierFeatures,
  registeredFeatureIds = [...HUNT_TIER_FEATURE_IDS],
}: {
  previousTierFeatures: Feature[];
  registeredFeatureIds?: string[];
}) => {
  const puts: PutBody[] = [];
  let stored: Feature[] = [
    ...previousTierFeatures,
    { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
  ];
  const request = jest.fn(async (req: PutBody) => {
    if (req.method === 'PUT') {
      puts.push(req);
      stored = req.body.features;
      return { data: {} };
    }
    if (req.method === 'GET' && req.path === INFERENCE_FEATURES_URL) {
      return { data: { features: registeredFeatureIds.map((featureId) => ({ featureId })) } };
    }
    if (req.method === 'GET' && req.path === INFERENCE_SETTINGS_URL) {
      return { data: { data: { features: stored } } };
    }
    return { data: {} };
  });

  return {
    kbnClient: { request } as unknown as KbnClient,
    puts: () => puts,
  };
};

const HUNT_MODEL_TIERS_SOURCE = join(
  __dirname,
  '../../../plugins/alertzero/server/services/watches/hunt/common/hunt_model_tiers.ts'
);

const pinnedTo = (id: string): Feature[] =>
  HUNT_TIER_FEATURE_IDS.map((featureId) => ({ feature_id: featureId, endpoints: [{ id }] }));

describe('hunt tier feature ids', () => {
  it('are the Efficient and Frontier tiers, in that order', () => {
    expect(HUNT_TIER_FEATURE_IDS).toEqual([
      ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
    ]);
    expect(HUNT_TIER_FEATURE_IDS).toEqual(['alertzero_efficient', 'alertzero_frontier']);
  });

  it('are the features hunt_models.ts resolves each hunt tier from', () => {
    const source = readFileSync(
      join(__dirname, '../../../plugins/alertzero/server/routes/hunt/lib/hunt_models.ts'),
      'utf8'
    );
    expect(source).toContain('featureId: HUNT_MODEL_TIER_FEATURE_IDS[tier]');
  });

  it('cover every tier HUNT_MODEL_TIERS lists (hunt_model_tiers.ts)', () => {
    const source = readFileSync(HUNT_MODEL_TIERS_SOURCE, 'utf8');
    // A tier added to the hunt without a pin here would run on the stack default.
    expect(source).toContain(
      "HUNT_MODEL_TIERS: readonly HuntModelTier[] = ['efficient', 'frontier'];"
    );
    expect(source).toContain('efficient: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID');
    expect(source).toContain('frontier: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID');
  });
});

describe('assertTierRegistered', () => {
  it('passes when every hunt tier is registered', () => {
    expect(() => assertTierRegistered(['agent_builder', ...HUNT_TIER_FEATURE_IDS])).not.toThrow();
  });

  it('fails when a tier was renamed away, naming what is registered', () => {
    expect(() => assertTierRegistered(['alertzero_efficient', 'alertzero_balanced'])).toThrow(
      /"alertzero_frontier" not registered.*alertzero_efficient, alertzero_balanced/
    );
  });

  it('fails when only Frontier is registered', () => {
    expect(() => assertTierRegistered(['alertzero_frontier'])).toThrow(
      /"alertzero_efficient" not registered/
    );
  });
});

describe('assertTierPinned', () => {
  it('passes when every tier stores the model under test', () => {
    expect(() => assertTierPinned({ features: pinnedTo('mut'), expected: 'mut' })).not.toThrow();
  });

  it('fails when a tier resolves to another endpoint or none', () => {
    expect(() =>
      assertTierPinned({
        features: [
          { feature_id: 'alertzero_efficient', endpoints: [{ id: 'default' }] },
          { feature_id: 'alertzero_frontier', endpoints: [{ id: 'mut' }] },
        ],
        expected: 'mut',
      })
    ).toThrow(/alertzero_efficient resolves to endpoint "default", not the model under test "mut"/);
    expect(() => assertTierPinned({ features: [], expected: 'mut' })).toThrow(/endpoint "none"/);
  });

  it('fails when only Frontier is pinned', () => {
    expect(() =>
      assertTierPinned({
        features: [{ feature_id: 'alertzero_frontier', endpoints: [{ id: 'mut' }] }],
        expected: 'mut',
      })
    ).toThrow(/alertzero_efficient resolves to endpoint "none"/);
  });
});

describe('modelSettingsForHuntWatch', () => {
  const previousTierFeatures: Feature[] = [
    { feature_id: 'alertzero_efficient', endpoints: [{ id: 'old-efficient-endpoint' }] },
    { feature_id: 'alertzero_frontier', endpoints: [{ id: 'old-frontier-endpoint' }] },
  ];
  const unrelated = {
    feature_id: 'unrelated_feature',
    endpoints: [{ id: 'pre-existing-endpoint' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pins every hunt tier and restores the captured picks, keeping other picks', async () => {
    const { kbnClient, puts } = makeKbnClient({ previousTierFeatures });

    await modelSettingsFixture()(
      { kbnClient, connector: { id: 'model-under-test' }, log },
      async () => {
        // body of the sweep — nothing to do
      }
    );

    const putsBodies = puts();
    expect(putsBodies).toHaveLength(2); // pin + restore

    expect(putsBodies[0].body.features).toEqual([
      unrelated,
      { feature_id: 'alertzero_efficient', endpoints: [{ id: 'model-under-test' }] },
      { feature_id: 'alertzero_frontier', endpoints: [{ id: 'model-under-test' }] },
    ]);

    // Restore PUT writes back the captured previous picks (not defaults, not
    // the pinned model) and keeps non-tier picks untouched.
    expect(putsBodies[1].body.features).toEqual([unrelated, ...previousTierFeatures]);
  });

  test('restore still runs when the sweep body throws', async () => {
    const { kbnClient, puts } = makeKbnClient({ previousTierFeatures });

    await expect(
      modelSettingsFixture()(
        { kbnClient, connector: { id: 'model-under-test' }, log },
        async () => {
          throw new Error('sweep failed');
        }
      )
    ).rejects.toThrow('sweep failed');

    const putsBodies = puts();
    expect(putsBodies).toHaveLength(2);
    expect(putsBodies[1].method).toBe('PUT');
    expect(putsBodies[1].body.features).toEqual([unrelated, ...previousTierFeatures]);
  });

  test('restores to no pick when a tier had none before the suite', async () => {
    const { kbnClient, puts } = makeKbnClient({ previousTierFeatures: [] });

    await modelSettingsFixture()(
      { kbnClient, connector: { id: 'model-under-test' }, log },
      async () => {}
    );

    expect(puts()[1].body.features).toEqual([unrelated]);
  });

  test('fails before pinning, and never runs the sweep, when a tier is not registered', async () => {
    const { kbnClient, puts } = makeKbnClient({
      previousTierFeatures: [],
      registeredFeatureIds: ['alertzero_efficient', 'alertzero_balanced'],
    });
    const sweep = jest.fn(async () => {});

    await expect(
      modelSettingsFixture()({ kbnClient, connector: { id: 'model-under-test' }, log }, sweep)
    ).rejects.toThrow(/not registered/);

    expect(sweep).not.toHaveBeenCalled();
    expect(puts()).toHaveLength(0);
  });
});
