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
import { ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import { HUNT_TIER_FEATURE_ID, assertTierPinned, assertTierRegistered, evaluate } from './evaluate';

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
  registeredFeatureIds = [HUNT_TIER_FEATURE_ID],
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

describe('hunt tier feature id', () => {
  it('is the tier the hunt coordinator and behavior routes resolve their model from', () => {
    expect(HUNT_TIER_FEATURE_ID).toBe(ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID);
    expect(HUNT_TIER_FEATURE_ID).toBe('alertzero_frontier');
  });

  it('is the feature hunt_models.ts resolves each hunt tier from', () => {
    const source = readFileSync(
      join(__dirname, '../../../plugins/alertzero/server/routes/hunt/lib/hunt_models.ts'),
      'utf8'
    );
    expect(source).toContain('featureId: HUNT_MODEL_TIER_FEATURE_IDS[tier]');
  });

  it('is the frontier entry HUNT_MODEL_TIER_FEATURE_IDS maps (hunt_model_tiers.ts)', () => {
    const source = readFileSync(
      join(
        __dirname,
        '../../../plugins/alertzero/server/services/watches/hunt/common/hunt_model_tiers.ts'
      ),
      'utf8'
    );
    expect(source).toContain('frontier: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID');
  });
});

describe('assertTierRegistered', () => {
  it('passes when the tier is registered', () => {
    expect(() => assertTierRegistered(['agent_builder', HUNT_TIER_FEATURE_ID])).not.toThrow();
  });

  it('fails when the tier was renamed away, naming what is registered', () => {
    expect(() => assertTierRegistered(['alertzero_efficient', 'alertzero_balanced'])).toThrow(
      /"alertzero_frontier" is not registered.*alertzero_efficient, alertzero_balanced/
    );
  });
});

describe('assertTierPinned', () => {
  it('passes when the stored pick is the model under test', () => {
    expect(() =>
      assertTierPinned({
        features: [{ feature_id: HUNT_TIER_FEATURE_ID, endpoints: [{ id: 'mut' }] }],
        expected: 'mut',
      })
    ).not.toThrow();
  });

  it('fails when the tier resolves to another endpoint or none', () => {
    expect(() =>
      assertTierPinned({
        features: [{ feature_id: HUNT_TIER_FEATURE_ID, endpoints: [{ id: 'default' }] }],
        expected: 'mut',
      })
    ).toThrow(/resolves to endpoint "default", not the model under test "mut"/);
    expect(() => assertTierPinned({ features: [], expected: 'mut' })).toThrow(/endpoint "none"/);
  });
});

describe('modelSettingsForHuntWatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pins the tier the product reads and restores the captured pick, keeping other picks', async () => {
    const previousTierFeatures = [
      { feature_id: HUNT_TIER_FEATURE_ID, endpoints: [{ id: 'old-frontier-endpoint' }] },
    ];
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
      { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
      { feature_id: 'alertzero_frontier', endpoints: [{ id: 'model-under-test' }] },
    ]);

    // Restore PUT writes back the captured previous pick (not defaults, not
    // the pinned model) and keeps non-tier picks untouched.
    expect(putsBodies[1].body.features).toEqual([
      { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
      { feature_id: 'alertzero_frontier', endpoints: [{ id: 'old-frontier-endpoint' }] },
    ]);
  });

  test('restore still runs when the sweep body throws', async () => {
    const previousTierFeatures = [
      { feature_id: HUNT_TIER_FEATURE_ID, endpoints: [{ id: 'old-frontier-endpoint' }] },
    ];
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
    expect(putsBodies[1].body.features).toEqual([
      { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
      { feature_id: 'alertzero_frontier', endpoints: [{ id: 'old-frontier-endpoint' }] },
    ]);
  });

  test('fails before pinning, and never runs the sweep, when the tier is not registered', async () => {
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
