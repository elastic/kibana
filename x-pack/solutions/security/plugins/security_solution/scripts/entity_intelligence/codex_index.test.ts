/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { indexCodexObservations } from './codex_index';
import { createCodexSessionParser } from './codex_session_parser';

const observations = () => {
  const parser = createCodexSessionParser({
    agentId: 'installation',
    spaceId: 'default',
    fileHash: 'fingerprint',
    hashSalt: 'salt',
    ingestedAt: '2026-10-12T00:00:00.000Z',
  });
  parser.consume(
    JSON.stringify({
      timestamp: '2026-10-12T00:00:00.000Z',
      type: 'session_meta',
      payload: { id: 'session', timestamp: '2026-10-12T00:00:00.000Z' },
    })
  );
  parser.consume(
    JSON.stringify({
      timestamp: '2026-10-12T00:00:01.000Z',
      type: 'response_item',
      payload: { type: 'function_call', name: 'test_tool', call_id: 'call' },
    })
  );
  return parser.finalize().observations;
};

describe('Codex index writes', () => {
  it('upserts stable IDs and publishes the summary after successful tool writes', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
    const client = new Client({ node: 'http://localhost:9200' });
    client.bulk = bulk;
    const docs = observations();
    await indexCodexObservations(client, 'codex-test', docs);
    expect(bulk.mock.calls[0][0].operations).toEqual([
      { index: { _index: 'codex-test', _id: docs[1].event.id } },
      docs[1],
    ]);
    expect(bulk.mock.calls[1][0].operations).toEqual([
      { index: { _index: 'codex-test', _id: docs[0].event.id } },
      docs[0],
    ]);
    await indexCodexObservations(client, 'codex-test', docs);
    expect(bulk.mock.calls[2][0].operations).toEqual(bulk.mock.calls[0][0].operations);
    expect(bulk.mock.calls[3][0].operations).toEqual(bulk.mock.calls[1][0].operations);
  });

  it('does not publish a complete summary after partial bulk failure or log raw server errors', async () => {
    const bulk = jest.fn().mockResolvedValue({
      errors: true,
      items: [{ index: { error: { reason: 'PRIVATE-SERVER-ERROR' } } }],
    });
    const client = new Client({ node: 'http://localhost:9200' });
    client.bulk = bulk;
    await expect(indexCodexObservations(client, 'codex-test', observations())).rejects.toThrow(
      'Codex bulk import failed for 1 documents; no raw response was logged.'
    );
    expect(bulk).toHaveBeenCalledTimes(1);
  });
});
