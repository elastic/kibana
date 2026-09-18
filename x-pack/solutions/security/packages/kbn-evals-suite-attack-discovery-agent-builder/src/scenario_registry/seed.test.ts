/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { AD2_DENSE_TARGET_ALERTS } from './dense_scenarios';
import { seedAd2ScenarioProfile } from './seed';

// Shape of a seeded id (`ids.ts`): the digest of the fixture coordinates, so
// the mocked failure names no scenario.
const REJECTED_DOCUMENT = {
  id: 'ad-scenario-alert-3f7c19ab02d84e51',
  reason: 'failed to parse field [kibana.alert.rule.name]',
};

const buildBulkResponse = (
  count: number,
  failures: Array<{ id: string; reason: string }> = []
) => ({
  errors: failures.length > 0,
  items: Array.from({ length: count }, (_, position) =>
    position < failures.length
      ? {
          index: {
            _id: failures[position].id,
            status: 400,
            error: { type: 'mapper_parsing_exception', reason: failures[position].reason },
          },
        }
      : { index: { _id: `doc-${position}`, status: 201 } }
  ),
  took: 1,
  ingest_took: 0,
});

/**
 * The seeding call issues two bulk requests — alerts first, then raw events —
 * so each test rejects exactly one of them.
 */
const buildBulk = (rejectedCall: 1 | 2 | undefined) => {
  let call = 0;
  return jest.fn().mockImplementation(({ operations }: { operations: unknown[] }) => {
    call += 1;
    const count = operations.length / 2;
    return Promise.resolve(
      call === rejectedCall
        ? buildBulkResponse(count, [REJECTED_DOCUMENT])
        : buildBulkResponse(count)
    );
  });
};

const buildEsClient = (bulk: jest.Mock): EsClient => ({ bulk } as unknown as EsClient);
const buildFetch = (): HttpHandler => jest.fn().mockResolvedValue({}) as unknown as HttpHandler;

describe('seedAd2ScenarioProfile', () => {
  it('rejects a profile whose alerts were partially rejected', async () => {
    const bulk = buildBulk(1);

    await expect(
      seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), { profile: 'dense' })
    ).rejects.toThrow(/mapper_parsing_exception.*failed to parse field/);
  });

  it('rejects a profile whose raw events were partially rejected', async () => {
    const bulk = buildBulk(2);

    await expect(
      seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), { profile: 'dense' })
    ).rejects.toThrow(/mapper_parsing_exception.*failed to parse field/);
  });

  it('seeds the dense profile when Elasticsearch accepts every document', async () => {
    const bulk = buildBulk(undefined);

    const summary = await seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), {
      profile: 'dense',
    });

    expect(summary.alertCount).toBe(AD2_DENSE_TARGET_ALERTS);
    expect(bulk).toHaveBeenCalledTimes(2);
  });
});
