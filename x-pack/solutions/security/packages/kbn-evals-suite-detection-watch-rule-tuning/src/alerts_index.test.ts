/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTS_INDEX,
  ALERTS_WORKFLOW_TAGS_FIELD,
  DETECTION_ENGINE_INDEX_API_PATH,
} from './constants';
import { ensureAlertsIndexReady, readAlertsIndexState } from './alerts_index';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const fieldCapsWith = (indices: string[], fields: Record<string, unknown>) =>
  jest.fn(async () => ({ indices: indices.map((name) => ({ name })), fields }));

const mapped = () =>
  fieldCapsWith([`.internal.${ALERTS_INDEX.slice(1)}-000001`], {
    [ALERTS_WORKFLOW_TAGS_FIELD]: { keyword: { type: 'keyword' } },
  });

/** The name resolves to a concrete index, so `_alias` 404s: the poisoned shape. */
const plainIndex = () => ({
  fieldCaps: fieldCapsWith([ALERTS_INDEX], {}),
  getAlias: jest.fn(async () => {
    throw new Error('alias [.alerts-security.alerts-default] missing');
  }),
});

const aliasedIndex = () => ({
  fieldCaps: fieldCapsWith([`.internal.${ALERTS_INDEX.slice(1)}-000001`], {}),
  getAlias: jest.fn(async () => ({
    [`.internal.${ALERTS_INDEX.slice(1)}-000001`]: { aliases: { [ALERTS_INDEX]: {} } },
  })),
});

const esClientWith = (parts: {
  fieldCaps: ReturnType<typeof fieldCapsWith>;
  getAlias?: jest.Mock;
}) =>
  ({
    fieldCaps: parts.fieldCaps,
    indices: { getAlias: parts.getAlias ?? jest.fn() },
  } as unknown as EsClient);

const httpOk = jest.fn(async () => ({ response: { status: 200 } })) as never;

describe('readAlertsIndexState', () => {
  it('reports the field as mapped when the alerts index carries it', async () => {
    const state = await readAlertsIndexState({
      esClient: esClientWith({ fieldCaps: mapped() }),
    });
    expect(state).toMatchObject({ fieldMapped: true, indexExists: true, plainIndex: false });
  });

  it('reports the index as missing when nothing matches the name', async () => {
    const state = await readAlertsIndexState({
      esClient: esClientWith({ fieldCaps: fieldCapsWith([], {}) }),
    });
    expect(state).toMatchObject({ fieldMapped: false, indexExists: false, plainIndex: false });
    expect(state.evidence).toContain('does not exist yet');
  });

  it('flags the poisoned shape: an index under the name with no alerting-framework alias', async () => {
    const state = await readAlertsIndexState({ esClient: esClientWith(plainIndex()) });
    expect(state).toMatchObject({ fieldMapped: false, indexExists: true, plainIndex: true });
    expect(state.evidence).toContain('plain, dynamically-mapped index');
  });

  it('does NOT flag an alias that merely lacks the field yet', async () => {
    // The race the suite has to survive: the framework's index exists but its
    // mapping has not landed. Waiting is right here; calling it poisoned would
    // fail a stack that is only slow.
    const state = await readAlertsIndexState({ esClient: esClientWith(aliasedIndex()) });
    expect(state).toMatchObject({ fieldMapped: false, indexExists: true, plainIndex: false });
    expect(state.evidence).toContain('does not map');
  });
});

describe('ensureAlertsIndexReady', () => {
  it('returns without touching the API when the field is already mapped', async () => {
    const fetch = jest.fn();
    await ensureAlertsIndexReady({
      fetch: fetch as never,
      esClient: esClientWith({ fieldCaps: mapped() }),
      log,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requests the bootstrap then polls until the field appears', async () => {
    let call = 0;
    const fieldCaps = jest.fn(async () => {
      call += 1;
      return call === 1 ? { indices: [], fields: {} } : mapped()();
    });
    await ensureAlertsIndexReady({
      fetch: httpOk,
      esClient: esClientWith({ fieldCaps }),
      log,
      pollIntervalMs: 1,
    });
    expect(fieldCaps).toHaveBeenCalledTimes(2);
    expect(httpOk).toHaveBeenCalledWith(DETECTION_ENGINE_INDEX_API_PATH, expect.anything());
  });

  it('fails fast on the poisoned shape instead of polling for the impossible', async () => {
    const fieldCaps = plainIndex().fieldCaps;
    await expect(
      ensureAlertsIndexReady({
        fetch: httpOk,
        esClient: esClientWith({ fieldCaps }),
        log,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow(/poisoned/i);
    expect(fieldCaps).toHaveBeenCalledTimes(1);
  });

  it('throws naming the last observed state when the field never appears', async () => {
    await expect(
      ensureAlertsIndexReady({
        fetch: httpOk,
        esClient: esClientWith({ fieldCaps: fieldCapsWith([], {}) }),
        log,
        timeoutMs: 5,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow(/does not exist yet/);
  });

  it('still polls when the bootstrap request fails (the solution may be mid-startup)', async () => {
    const fetch = jest.fn(async () => {
      throw new Error('400 Bad Request');
    });
    let call = 0;
    const fieldCaps = jest.fn(async () => {
      call += 1;
      return call === 1 ? { indices: [], fields: {} } : mapped()();
    });
    await ensureAlertsIndexReady({
      fetch: fetch as never,
      esClient: esClientWith({ fieldCaps }),
      log,
      pollIntervalMs: 1,
    });
    expect(fieldCaps).toHaveBeenCalledTimes(2);
  });
});
