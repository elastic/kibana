/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { BATCHED_GENERATION_WORKFLOW_ID } from './constants';
import type { InferenceSettingsClient } from './model_pin';
import { PINNED_INFERENCE_FEATURE_IDS, pinInferenceFeatures } from './model_pin';

interface StoredFeature {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

const log = { info: jest.fn() } as unknown as ToolingLog;

const inferenceSettingsServer = ({
  initial = [],
  dropFromStored = [],
}: { initial?: StoredFeature[]; dropFromStored?: string[] } = {}) => {
  let stored = initial;
  const request = jest.fn(async ({ method, body }: { method: string; body?: unknown }) => {
    if (method === 'PUT') {
      stored = (body as { features: StoredFeature[] }).features.filter(
        ({ feature_id: id }) => !dropFromStored.includes(id)
      );
    }
    return { data: { data: { features: stored } } };
  });
  return { kbnClient: { request } as unknown as InferenceSettingsClient, request };
};

const WORKFLOW_YAML = join(
  __dirname,
  '../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/attack_discovery_batched_generation.yaml'
);

/**
 * Every `feature_id:` a workflow YAML states, as a scalar or a `- item` list. Matches the
 * key at the start of a line only, so `connector-id-by-feature:` and comments do not count.
 */
const featureIdsStatedBy = (yaml: string): string[] => {
  const ids = new Set<string>();
  for (const [, scalar, list] of yaml.matchAll(
    /^[ \t]*feature_id:[ \t]*([^\s#][^\n]*?)?[ \t]*\n((?:[ \t]+- [^\n]+\n)*)/gm
  )) {
    if (scalar) ids.add(scalar.replace(/^["']|["']$/g, ''));
    for (const [, item] of (list ?? '').matchAll(/- ([^\s#]+)/g)) ids.add(item);
  }
  return [...ids];
};

describe('featureIdsStatedBy', () => {
  it('reads a list and a scalar, and ignores comments and similar keys', () => {
    const yaml = [
      '# feature_id: in_a_comment',
      'feature_id:',
      '  - tier_a',
      '  - tier_b',
      'other:',
      '  feature_id: tier_c',
      'connector-id-by-feature: tier_d',
      '',
    ].join('\n');
    expect(featureIdsStatedBy(yaml).sort()).toEqual(['tier_a', 'tier_b', 'tier_c']);
  });
});

describe('PINNED_INFERENCE_FEATURE_IDS', () => {
  it(`covers every feature_id ${BATCHED_GENERATION_WORKFLOW_ID} resolves a model through`, () => {
    const tiers = featureIdsStatedBy(readFileSync(WORKFLOW_YAML, 'utf8'));
    expect(tiers).toEqual(
      expect.arrayContaining(['alertzero_frontier', 'alertzero_template_models'])
    );
    expect(PINNED_INFERENCE_FEATURE_IDS).toEqual(expect.arrayContaining(tiers));
  });
});

describe('pinInferenceFeatures', () => {
  it('writes the eval connector onto every pinned feature and keeps other picks', async () => {
    const { kbnClient, request } = inferenceSettingsServer({
      initial: [
        { feature_id: 'other_feature', endpoints: [{ id: 'keep-me' }] },
        { feature_id: 'alertzero_frontier', endpoints: [{ id: '.anthropic-claude-5-opus' }] },
      ],
    });

    await pinInferenceFeatures({ kbnClient, connectorId: 'eis-candidate', log });

    const put = request.mock.calls.find(([{ method }]) => method === 'PUT')![0] as {
      body: { features: StoredFeature[] };
    };
    expect(put.body.features).toEqual([
      { feature_id: 'other_feature', endpoints: [{ id: 'keep-me' }] },
      ...PINNED_INFERENCE_FEATURE_IDS.map((feature_id) => ({
        feature_id,
        endpoints: [{ id: 'eis-candidate' }],
      })),
    ]);
  });

  it('returns a restore function that puts the previous document back', async () => {
    const initial = [{ feature_id: 'alertzero_frontier', endpoints: [{ id: 'original' }] }];
    const { kbnClient, request } = inferenceSettingsServer({ initial });

    const restore = await pinInferenceFeatures({ kbnClient, connectorId: 'eis-candidate', log });
    await restore();

    const puts = request.mock.calls.filter(([{ method }]) => method === 'PUT');
    expect(puts).toHaveLength(2);
    expect((puts[1][0] as { body: { features: StoredFeature[] } }).body.features).toEqual(initial);
  });

  it('throws naming the feature when the read-back does not carry the connector', async () => {
    const { kbnClient } = inferenceSettingsServer({ dropFromStored: ['alertzero_frontier'] });

    await expect(
      pinInferenceFeatures({ kbnClient, connectorId: 'eis-candidate', log })
    ).rejects.toThrow(/did not stick for alertzero_frontier/);
  });

  it('throws when the connector has no id', async () => {
    const { kbnClient, request } = inferenceSettingsServer();

    await expect(pinInferenceFeatures({ kbnClient, connectorId: undefined, log })).rejects.toThrow(
      /has no id/
    );
    expect(request).not.toHaveBeenCalled();
  });
});
