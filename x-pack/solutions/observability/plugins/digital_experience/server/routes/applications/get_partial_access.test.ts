/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hasPartialReadAccess } from './get_partial_access';

const OTEL = ['logs-*.otel-*', 'traces-*.otel-*'];

interface Resolved {
  indices?: string[];
  /** Each backing index and its data stream. */
  backingIndices?: Record<string, string>;
  dataStreams?: string[];
  /** Each alias and the targets it points to. */
  aliases?: Record<string, string[]>;
}

const toResponse = ({
  indices = [],
  backingIndices = {},
  dataStreams = [],
  aliases = {},
}: Resolved) => ({
  indices: [
    ...indices.map((name) => ({ name, attributes: ['open'] })),
    ...Object.entries(backingIndices).map(([name, dataStream]) => ({
      name,
      attributes: ['open'],
      data_stream: dataStream,
    })),
  ],
  aliases: Object.entries(aliases).map(([name, targets]) => ({ name, indices: targets })),
  data_streams: dataStreams.map((name) => ({ name, backing_indices: [], timestamp_field: '' })),
});

/**
 * `all` is what the internal user resolves, `readable` what the user resolves; of those, the user
 * can read every name but the `metadataOnly` ones.
 */
const setup = ({
  all = {},
  readable = {},
  metadataOnly = [],
}: {
  all?: Resolved;
  readable?: Resolved;
  metadataOnly?: string[];
}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  internalEsClient.indices.resolveIndex.mockResolvedValue(toResponse(all));
  esClient.indices.resolveIndex.mockResolvedValue(toResponse(readable));
  esClient.security.hasPrivileges.mockImplementation((async ({
    index,
  }: {
    index: Array<{ names: string[] }>;
  }) => ({
    index: Object.fromEntries(
      index[0].names.map((name) => [name, { read: !metadataOnly.includes(name) }])
    ),
  })) as never);
  return { esClient, internalEsClient, logger };
};

const resolvedExpression = (params: ReturnType<typeof setup>) =>
  params.internalEsClient.indices.resolveIndex.mock.calls[0]?.[0]?.name;

describe('hasPartialReadAccess', () => {
  describe('read access', () => {
    it('returns false when the user resolves all the data', async () => {
      const dataStreams = ['traces-generic.otel-production', 'logs-generic.otel-production'];
      const params = setup({ all: { dataStreams }, readable: { dataStreams } });

      await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
        false
      );
    });

    it('returns true when the user does not resolve one data stream', async () => {
      const params = setup({
        all: { dataStreams: ['traces-generic.otel-production', 'logs-generic.otel-production'] },
        readable: { dataStreams: ['traces-generic.otel-production'] },
      });

      await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
        true
      );
    });

    it('returns true when the user does not resolve one standalone index', async () => {
      const params = setup({
        all: { dataStreams: ['traces-apm-default'], indices: ['apm-7.17.0-transaction'] },
        readable: { dataStreams: ['traces-apm-default'] },
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*,apm-*'] })
      ).resolves.toBe(true);
    });

    it('counts a target the user reaches through an alias', async () => {
      const params = setup({
        all: {
          indices: ['apm-7.17.0-transaction'],
          aliases: { 'apm-transaction': ['apm-7.17.0-transaction'] },
        },
        readable: { aliases: { 'apm-transaction': ['apm-7.17.0-transaction'] } },
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(false);
    });

    it('returns true when the user can not resolve an alias whose target is matched only through it', async () => {
      const params = setup({
        all: { aliases: { 'apm-transaction': ['legacy-transaction'] } },
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(true);
    });

    it('counts a backing index as its data stream', async () => {
      const params = setup({
        all: { backingIndices: { '.ds-traces-apm.rum-default-000001': 'traces-apm.rum-default' } },
        readable: { dataStreams: ['traces-apm.rum-default'] },
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['.ds-traces-apm.rum-*'] })
      ).resolves.toBe(false);
    });

    it('returns true when the user does not resolve a backing index matched on its own', async () => {
      const params = setup({
        all: { backingIndices: { '.ds-traces-apm.rum-default-000001': 'traces-apm.rum-default' } },
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['.ds-traces-apm.rum-*'] })
      ).resolves.toBe(true);
    });

    it('leaves out the linked projects a local pattern resolves to', async () => {
      const params = setup({
        all: {
          dataStreams: ['traces-apm-default', 'linked:traces-apm-default'],
          aliases: { 'linked:apm-alias': ['linked:apm-transaction'] },
        },
        readable: { dataStreams: ['traces-apm-default'] },
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
    });

    it('returns true when the user only holds metadata access to some of the data it resolves', async () => {
      const dataStreams = ['traces-generic.otel-production', 'logs-generic.otel-production'];
      const params = setup({
        all: { dataStreams },
        readable: { dataStreams },
        metadataOnly: ['logs-generic.otel-production'],
      });

      await expect(hasPartialReadAccess({ ...params, getIndices: async () => OTEL })).resolves.toBe(
        true
      );
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(
        { index: [{ names: dataStreams, privileges: ['read'] }] },
        expect.anything()
      );
    });

    it('does not count an alias the user only holds metadata access to', async () => {
      const aliases = { 'apm-transaction': ['legacy-transaction'] };
      const params = setup({
        all: { aliases },
        readable: { aliases },
        metadataOnly: ['apm-transaction'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(true);
    });

    it('counts a backing index read through its data stream privileges', async () => {
      const backingIndices = { '.ds-traces-apm.rum-default-000001': 'traces-apm.rum-default' };
      const params = setup({
        all: { backingIndices },
        readable: { backingIndices },
        metadataOnly: ['.ds-traces-apm.rum-default-000001'],
      });

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['.ds-traces-apm.rum-*'] })
      ).resolves.toBe(false);
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(
        {
          index: [
            {
              names: ['.ds-traces-apm.rum-default-000001', 'traces-apm.rum-default'],
              privileges: ['read'],
            },
          ],
        },
        expect.anything()
      );
    });

    it('returns false when the expression matches nothing', async () => {
      const params = setup({});

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['apm-*'] })
      ).resolves.toBe(false);
      expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('resolves the same expression with both clients and passes the abort signal', async () => {
      const dataStreams = ['traces-apm-default'];
      const params = setup({ all: { dataStreams }, readable: { dataStreams } });
      const { signal } = new AbortController();

      await hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'], signal });

      const request = {
        name: 'traces-apm*',
        expand_wildcards: 'open',
        ignore_unavailable: true,
        allow_no_indices: true,
      };
      expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledWith(request, {
        signal,
      });
      expect(params.esClient.indices.resolveIndex).toHaveBeenCalledWith(request, { signal });
      expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith(expect.anything(), {
        signal,
      });
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
      expect(resolvedExpression(params)).toBe('traces-apm*,apm-*,logs-apm*');
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

    it('leaves out the remote clusters, which the internal user can not resolve', async () => {
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
      expect(params.esClient.indices.resolveIndex).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('returns false when resolving as the user throws', async () => {
      const params = setup({ all: { dataStreams: ['traces-apm-default'] } });
      params.esClient.indices.resolveIndex.mockRejectedValue(new Error('forbidden'));

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
      expect(params.logger.debug).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
    });

    it('returns false when the privilege check throws, as with security disabled', async () => {
      const dataStreams = ['traces-apm-default'];
      const params = setup({ all: { dataStreams }, readable: { dataStreams } });
      params.esClient.security.hasPrivileges.mockRejectedValue(new Error('security disabled'));

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
      expect(params.logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('security disabled')
      );
    });

    it('returns false when resolving as the internal user throws', async () => {
      const params = setup({});
      params.internalEsClient.indices.resolveIndex.mockRejectedValue(new Error('resolve failed'));

      await expect(
        hasPartialReadAccess({ ...params, getIndices: async () => ['traces-apm*'] })
      ).resolves.toBe(false);
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
