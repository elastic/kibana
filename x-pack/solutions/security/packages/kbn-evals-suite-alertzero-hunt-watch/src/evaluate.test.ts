/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { evaluate } from './evaluate';

const INFERENCE_SETTINGS_URL = '/internal/search_inference_endpoints/settings';

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

interface PutBody {
  method: string;
  path: string;
  body: { features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }> };
}

const makeKbnClient = ({
  previousTierFeatures,
}: {
  previousTierFeatures: Array<{ feature_id: string; endpoints: Array<{ id: string }> }>;
}) => {
  const puts: PutBody[] = [];
  const request = jest.fn(async (req: PutBody) => {
    if (req.method === 'PUT') puts.push(req);
    if (req.method === 'GET' && req.path === INFERENCE_SETTINGS_URL) {
      return {
        data: {
          data: {
            features: [
              ...previousTierFeatures,
              {
                feature_id: 'unrelated_feature',
                endpoints: [{ id: 'pre-existing-endpoint' }],
              },
            ],
          },
        },
      };
    }
    return { data: {} };
  });

  return {
    kbnClient: { request } as unknown as KbnClient,
    puts: () => puts,
  };
};

describe('modelSettingsForHuntWatch teardown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('restore writes back exactly the captured tier features, keeping other picks', async () => {
    const previousTierFeatures = [
      { feature_id: 'alertzero_fast', endpoints: [{ id: 'old-fast-endpoint' }] },
      { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'old-reasoning-endpoint' }] },
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

    // First PUT pins both tiers to the model under test.
    expect(putsBodies[0].body.features).toEqual([
      { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
      { feature_id: 'alertzero_fast', endpoints: [{ id: 'model-under-test' }] },
      { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'model-under-test' }] },
    ]);

    // Restore PUT writes back the captured previous picks (not defaults, not
    // the pinned model) and keeps non-tier picks untouched.
    expect(putsBodies[1].body.features).toEqual([
      { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
      { feature_id: 'alertzero_fast', endpoints: [{ id: 'old-fast-endpoint' }] },
      { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'old-reasoning-endpoint' }] },
    ]);
  });

  test('restore still runs when the sweep body throws', async () => {
    const previousTierFeatures = [
      { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'old-reasoning-endpoint' }] },
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

    // The teardown still issued the restore PUT with the captured settings.
    const putsBodies = puts();
    expect(putsBodies).toHaveLength(2);
    expect(putsBodies[1].method).toBe('PUT');
    expect(putsBodies[1].body.features).toEqual([
      { feature_id: 'unrelated_feature', endpoints: [{ id: 'pre-existing-endpoint' }] },
      { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'old-reasoning-endpoint' }] },
    ]);
  });
});
