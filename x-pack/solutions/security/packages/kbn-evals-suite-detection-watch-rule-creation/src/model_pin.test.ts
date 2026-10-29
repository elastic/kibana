/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
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

const WORKFLOW_DEFINITIONS =
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero';

/** Every inference feature a workflow YAML resolves via `connector-id-by-feature` (scalar or list). */
const tiersResolvedBy = (yamlFile: string): string[] => {
  const yaml = readFileSync(join(__dirname, WORKFLOW_DEFINITIONS, yamlFile), 'utf8');
  const tiers = new Set<string>();
  for (const [, scalar, list] of yaml.matchAll(
    /connector-id-by-feature:[ \t]*(\S+)?[ \t]*\n((?:[ \t]+- \S+\n)*)/g
  )) {
    if (scalar) tiers.add(scalar);
    for (const [, item] of (list ?? '').matchAll(/- (\S+)/g)) tiers.add(item);
  }
  return [...tiers];
};

describe('PINNED_INFERENCE_FEATURE_IDS', () => {
  it('covers every tier rule_creation.yaml resolves a model through', () => {
    const tiers = tiersResolvedBy('rule_creation.yaml');
    expect(tiers.length).toBeGreaterThan(0);
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
