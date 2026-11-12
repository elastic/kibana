/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hasPartialReadAccess } from './get_partial_access';

const setup = ({
  dataStreams = [],
  indices = [],
  aliases = [],
  readable = [],
}: {
  /** What the patterns resolve to. */
  dataStreams?: string[];
  indices?: string[];
  aliases?: string[];
  /** The names the user can read. */
  readable?: string[];
}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  internalEsClient.indices.resolveIndex.mockResolvedValue({
    indices: indices.map((name) => ({ name, attributes: ['open'] })),
    aliases: aliases.map((name) => ({ name, indices: [] })),
    data_streams: dataStreams.map((name) => ({ name, backing_indices: [], timestamp_field: '' })),
  });
  esClient.security.hasPrivileges.mockImplementation((async ({
    index,
  }: {
    index: Array<{ names: string[] }>;
  }) => ({
    index: Object.fromEntries(
      index[0].names.map((name) => [name, { read: readable.includes(name) }])
    ),
  })) as never);
  return { esClient, internalEsClient, logger };
};

const OTEL = ['logs-*.otel-*', 'traces-*.otel-*'];

describe('hasPartialReadAccess', () => {
  it('returns false when the user can read every index the patterns match', async () => {
    const params = setup({
      dataStreams: ['traces-generic.otel-production', 'logs-generic.otel-production'],
      readable: ['traces-generic.otel-production', 'logs-generic.otel-production'],
    });

    await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
      false
    );
  });

  it('returns true when one index is not readable', async () => {
    const params = setup({
      dataStreams: ['traces-generic.otel-production', 'logs-generic.otel-production'],
      readable: ['traces-generic.otel-production'],
    });

    await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
      true
    );
  });

  it('checks the concrete names, so a role narrower than the wildcard still reads them all', async () => {
    const params = setup({
      dataStreams: ['traces-generic.otel-production'],
      indices: ['apm-7.17.0-transaction'],
      aliases: ['apm-alias'],
      readable: ['traces-generic.otel-production', 'apm-7.17.0-transaction', 'apm-alias'],
    });

    await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
      false
    );
    expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [
        {
          names: ['apm-7.17.0-transaction', 'apm-alias', 'traces-generic.otel-production'],
          privileges: ['read'],
        },
      ],
    });
  });

  it('resolves every pattern once, open only, without the Agent Builder indices', async () => {
    const params = setup({});

    await hasPartialReadAccess({ ...params, getIndices: async () => OTEL });

    expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledTimes(1);
    expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: 'logs-*.otel-*,-logs-agent_builder.otel-*,traces-*.otel-*,-traces-agent_builder.otel-*',
      expand_wildcards: 'open',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  });

  it('splits comma-separated patterns, deduplicates them and drops exclusions and ignored ones', async () => {
    const params = setup({});

    await hasPartialReadAccess({
      ...params,
      getIndices: async () => [
        'traces-apm*,apm-*,traces-*.otel-*',
        'logs-apm*, apm-*',
        '-traces-apm.rum*',
      ],
      ignoredPatterns: OTEL,
    });

    expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'traces-apm*,apm-*,logs-apm*' })
    );
  });

  it('skips the privilege check when the patterns match nothing', async () => {
    const params = setup({});

    await expect(
      hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
    ).resolves.toBe(false);
    expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('skips both calls when every pattern is ignored', async () => {
    const params = setup({});

    await expect(
      hasPartialReadAccess({ ...params, getIndices: async () => OTEL, ignoredPatterns: OTEL })
    ).resolves.toBe(false);
    expect(params.internalEsClient.indices.resolveIndex).not.toHaveBeenCalled();
  });

  it('returns false when the privilege check throws, as with security disabled', async () => {
    const params = setup({ dataStreams: ['traces-apm-default'] });
    params.esClient.security.hasPrivileges.mockRejectedValue(new Error('security disabled'));

    await expect(
      hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
    ).resolves.toBe(false);
    expect(params.logger.debug).toHaveBeenCalledWith(expect.stringContaining('security disabled'));
  });

  it('returns false when reading the indices fails', async () => {
    const params = setup({});

    await expect(
      hasPartialReadAccess({
        ...params,
        getIndices: async () => {
          throw new Error('no settings');
        },
      })
    ).resolves.toBe(false);
    expect(params.internalEsClient.indices.resolveIndex).not.toHaveBeenCalled();
    expect(params.logger.debug).toHaveBeenCalledWith(expect.stringContaining('no settings'));
  });
});
