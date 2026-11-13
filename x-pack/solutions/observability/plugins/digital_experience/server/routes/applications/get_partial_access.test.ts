/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hasPartialReadAccess } from './get_partial_access';

const OTEL = ['logs-*.otel-*', 'traces-*.otel-*'];

const setup = ({
  dataStreams = [],
  indices = [],
  backingIndices = [],
  aliases = {},
  readable = [],
}: {
  /** What the expression resolves to. */
  dataStreams?: string[];
  indices?: string[];
  backingIndices?: string[];
  /** Each alias and the targets it points to. */
  aliases?: Record<string, string[]>;
  /** The names the user can read. */
  readable?: string[];
}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  internalEsClient.indices.resolveIndex.mockResolvedValue({
    indices: [
      ...indices.map((name) => ({ name, attributes: ['open'] })),
      ...backingIndices.map((name) => ({ name, attributes: ['open'], data_stream: 'ds' })),
    ],
    aliases: Object.entries(aliases).map(([name, targets]) => ({ name, indices: targets })),
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

const resolvedExpression = (params: ReturnType<typeof setup>) =>
  params.internalEsClient.indices.resolveIndex.mock.calls[0]?.[0]?.name;

describe('hasPartialReadAccess', () => {
  describe('read access', () => {
    it('returns false when the user can read every index the expression matches', async () => {
      const params = setup({
        dataStreams: ['traces-generic.otel-production', 'logs-generic.otel-production'],
        readable: ['traces-generic.otel-production', 'logs-generic.otel-production'],
      });

      await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
        false
      );
    });

    it('returns true when one data stream is not readable', async () => {
      const params = setup({
        dataStreams: ['traces-generic.otel-production', 'logs-generic.otel-production'],
        readable: ['traces-generic.otel-production'],
      });

      await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
        true
      );
    });

    it('returns true when one standalone index is not readable', async () => {
      const params = setup({
        dataStreams: ['traces-apm-default'],
        indices: ['apm-7.17.0-transaction'],
        readable: ['traces-apm-default'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*,apm-*'] })
      ).resolves.toBe(true);
    });

    it('checks the concrete names, so a role narrower than the wildcard still reads them all', async () => {
      const params = setup({
        dataStreams: ['traces-generic.otel-production'],
        readable: ['traces-generic.otel-production'],
      });

      await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
        false
      );
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(
        { index: [{ names: ['traces-generic.otel-production'], privileges: ['read'] }] },
        expect.anything()
      );
    });

    it('leaves out backing indices, which are read through their data stream', async () => {
      const params = setup({
        dataStreams: ['traces-apm-default'],
        backingIndices: ['.ds-traces-apm-default-000001'],
        readable: ['traces-apm-default'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(
        { index: [{ names: ['traces-apm-default'], privileges: ['read'] }] },
        expect.anything()
      );
    });

    it('counts a target readable through an alias the expression matches', async () => {
      const params = setup({
        indices: ['apm-7.17.0-transaction'],
        aliases: { 'apm-transaction': ['apm-7.17.0-transaction'] },
        readable: ['apm-transaction'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(false);
    });

    it('returns true when a target matched only through an alias can not be read through it', async () => {
      const params = setup({
        aliases: { 'apm-transaction': ['legacy-transaction'] },
        readable: ['legacy-transaction'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(true);
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(
        { index: [{ names: ['apm-transaction'], privileges: ['read'] }] },
        expect.anything()
      );
    });

    it('leaves out the linked projects a local pattern resolves to', async () => {
      const params = setup({
        dataStreams: ['traces-apm-default', 'linked:traces-apm-default'],
        aliases: { 'linked:apm-alias': ['linked:traces-apm-default'] },
        readable: ['traces-apm-default'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(
        { index: [{ names: ['traces-apm-default'], privileges: ['read'] }] },
        expect.anything()
      );
    });

    it('passes the abort signal to both calls', async () => {
      const params = setup({ dataStreams: ['traces-apm-default'] });
      const { signal } = new AbortController();

      await hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'], signal });

      expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledWith(expect.anything(), {
        signal,
      });
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(expect.anything(), {
        signal,
      });
    });

    it('returns false without checking privileges when the expression matches nothing', async () => {
      const params = setup({});

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(false);
      expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });
  });

  describe('index expression', () => {
    it('builds one expression like the search: flattened, trimmed and deduplicated', async () => {
      const params = setup({});

      await hasPartialReadAccess({
        ...params,
        getIndices: async () => ['traces-apm*,apm-*', 'logs-apm*, apm-*', 'traces-apm*,apm-*'],
      });

      expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledTimes(1);
      expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledWith(
        {
          name: 'traces-apm*,apm-*,logs-apm*',
          expand_wildcards: 'open',
          ignore_unavailable: true,
          allow_no_indices: true,
        },
        expect.anything()
      );
    });

    it('keeps an exclusion where the search has it, so it applies to the other lists too', async () => {
      const params = setup({});

      await hasPartialReadAccess({
        ...params,
        getIndices: async () => ['traces-apm*,-traces-apm.private-*', 'logs-apm*', 'traces-apm*'],
      });

      expect(resolvedExpression(params)).toBe('traces-apm*,-traces-apm.private-*,logs-apm*');
    });

    it('leaves out the ignored patterns', async () => {
      const params = setup({});

      await hasPartialReadAccess({
        ...params,
        getIndices: async () => ['traces-apm*,apm-*,traces-*.otel-*', 'logs-apm*,logs-*.otel-*'],
        ignoredPatterns: OTEL,
      });

      expect(resolvedExpression(params)).toBe('traces-apm*,apm-*,logs-apm*');
    });

    it('drops an exclusion left with no pattern before it', async () => {
      const params = setup({});

      await hasPartialReadAccess({
        ...params,
        getIndices: async () => ['traces-*.otel-*,-traces-apm.private-*,traces-apm*'],
        ignoredPatterns: OTEL,
      });

      expect(resolvedExpression(params)).toBe('traces-apm*');
    });

    it('excludes the Agent Builder indices from the OTel wildcards', async () => {
      const params = setup({});

      await hasPartialReadAccess({ ...params, getIndices: async () => OTEL });

      expect(resolvedExpression(params)).toBe(
        'logs-*.otel-*,-logs-agent_builder.otel-*,traces-*.otel-*,-traces-agent_builder.otel-*'
      );
    });

    it('leaves out the remote clusters, which local privileges do not cover', async () => {
      const params = setup({});

      await hasPartialReadAccess({
        ...params,
        getIndices: async () => ['traces-apm*,remote:traces-apm*,-remote:traces-apm.private-*'],
      });

      expect(resolvedExpression(params)).toBe('traces-apm*');
    });

    it('keeps a local pattern with a selector, which is not a remote cluster', async () => {
      const params = setup({});

      await hasPartialReadAccess({ ...params, getIndices: async () => ['logs-apm*::failures'] });

      expect(resolvedExpression(params)).toBe('logs-apm*::failures');
    });

    it('skips both calls when only ignored, remote or exclusion patterns are left', async () => {
      const params = setup({});

      await expect(
        hasPartialReadAccess({
          ...params,
          getIndices: async () => ['remote:traces-apm*', 'traces-*.otel-*,-traces-apm.private-*'],
          ignoredPatterns: OTEL,
        })
      ).resolves.toBe(false);
      expect(params.internalEsClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('returns false when the privilege check throws, as with security disabled', async () => {
      const params = setup({ dataStreams: ['traces-apm-default'] });
      params.esClient.security.hasPrivileges.mockRejectedValue(new Error('security disabled'));

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
      expect(params.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('security disabled')
      );
    });

    it('returns false when resolving the expression throws', async () => {
      const params = setup({});
      params.internalEsClient.indices.resolveIndex.mockRejectedValue(new Error('resolve failed'));

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
      expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
      expect(params.logger.debug).toHaveBeenCalledWith(expect.stringContaining('resolve failed'));
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
});
