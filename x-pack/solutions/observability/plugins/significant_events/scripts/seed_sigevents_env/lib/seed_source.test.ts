/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from './get_connection_config';
import { kibanaRequest } from './kibana';
import { SEED_SOURCE_TITLE, ensureSeedSource, findSeedSource } from './seed_source';

jest.mock('./kibana');

const config: ConnectionConfig = {
  esUrl: 'http://elasticsearch.test',
  kibanaUrl: 'http://kibana.test',
  username: 'elastic',
  password: 'changeme',
};
const log = { info: jest.fn() } as unknown as ToolingLog;
const request = jest.mocked(kibanaRequest);

const seedSource = {
  id: 'seed-source-id',
  title: SEED_SOURCE_TITLE,
  slug: 'significant-events-seed',
  view_name: '$.nightshift.sources.default.significant-events-seed',
};

describe('seed source', () => {
  beforeEach(() => {
    request.mockReset();
  });

  describe('findSeedSource', () => {
    it('matches the exact title among prefix search results', async () => {
      request.mockResolvedValueOnce({
        status: 200,
        data: {
          sources: [
            { ...seedSource, id: 'other', title: `${SEED_SOURCE_TITLE} (copy)` },
            seedSource,
          ],
        },
      });

      await expect(findSeedSource(config, 'seed-space')).resolves.toBe(seedSource);
      expect(request).toHaveBeenCalledWith(
        config,
        'GET',
        `/internal/nightshift/sources?search=${encodeURIComponent(SEED_SOURCE_TITLE)}&per_page=100`,
        undefined,
        'seed-space'
      );
    });

    it('returns undefined when no title matches', async () => {
      request.mockResolvedValueOnce({ status: 200, data: { sources: [] } });

      await expect(findSeedSource(config, 'default')).resolves.toBeUndefined();
    });

    it('throws when listing fails', async () => {
      request.mockResolvedValueOnce({ status: 403, data: { message: 'forbidden' } });

      await expect(findSeedSource(config, 'default')).rejects.toThrow(
        'Failed to list sources: 403'
      );
    });
  });

  describe('ensureSeedSource', () => {
    it('reuses an existing source without creating one', async () => {
      request.mockResolvedValueOnce({ status: 200, data: { sources: [seedSource] } });

      await expect(ensureSeedSource(config, 'default', 'logs-synth-default', log)).resolves.toBe(
        seedSource
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('creates the source over the data stream when none exists', async () => {
      request
        .mockResolvedValueOnce({ status: 200, data: { sources: [] } })
        .mockResolvedValueOnce({ status: 200, data: { source: seedSource } });

      await expect(ensureSeedSource(config, 'default', 'logs-synth-default', log)).resolves.toBe(
        seedSource
      );
      expect(request).toHaveBeenLastCalledWith(
        config,
        'POST',
        '/internal/nightshift/sources',
        expect.objectContaining({ title: SEED_SOURCE_TITLE, esql: 'FROM logs-synth-default' }),
        'default'
      );
    });

    it('throws when the source cannot be created', async () => {
      request
        .mockResolvedValueOnce({ status: 200, data: { sources: [] } })
        .mockResolvedValueOnce({ status: 400, data: { message: 'no such index' } });

      await expect(ensureSeedSource(config, 'default', 'logs-synth-default', log)).rejects.toThrow(
        'Failed to create the seed source: 400'
      );
    });
  });
});
