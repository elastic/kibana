/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hasPartialReadAccess } from './get_partial_access';

type Privileges = Record<string, { read: boolean }>;

const NOTHING = { indices: [], aliases: [], data_streams: [] };
const SOME = { indices: [], aliases: [], data_streams: [{ name: 'x', backing_indices: [] }] };

const setup = ({
  existing,
  privileges,
}: {
  /** Patterns that match something; every other pattern matches nothing. */
  existing: string[];
  privileges?: Privileges;
}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  internalEsClient.indices.resolveIndex.mockImplementation((async ({ name }: { name: string }) =>
    existing.includes(name) ? SOME : NOTHING) as never);
  esClient.security.hasPrivileges.mockResolvedValue({
    index: privileges ?? {},
  } as never);
  return { esClient, internalEsClient, logger };
};

describe('hasPartialReadAccess', () => {
  it('returns false when the user can read every pattern', async () => {
    const params = setup({
      existing: ['logs-*.otel-*', 'traces-*.otel-*'],
      privileges: {
        'logs-*.otel-*,-logs-agent_builder.otel-*': { read: true },
        'traces-*.otel-*,-traces-agent_builder.otel-*': { read: true },
      },
    });

    await expect(
      hasPartialReadAccess({ ...params, indices: ['logs-*.otel-*', 'traces-*.otel-*'] })
    ).resolves.toBe(false);
  });

  it('returns true when one pattern is denied', async () => {
    const params = setup({
      existing: ['logs-*.otel-*', 'traces-*.otel-*'],
      privileges: {
        'logs-*.otel-*,-logs-agent_builder.otel-*': { read: true },
        'traces-*.otel-*,-traces-agent_builder.otel-*': { read: false },
      },
    });

    await expect(
      hasPartialReadAccess({ ...params, indices: ['logs-*.otel-*', 'traces-*.otel-*'] })
    ).resolves.toBe(true);
  });

  it('leaves out a denied pattern that matches no index', async () => {
    const params = setup({
      existing: ['traces-apm*'],
      privileges: { 'traces-apm*': { read: true } },
    });

    await expect(
      hasPartialReadAccess({ ...params, indices: ['apm-*', 'traces-apm*'] })
    ).resolves.toBe(false);
    expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['traces-apm*'], privileges: ['read'] }],
    });
  });

  it('skips the privilege check when no pattern matches an index', async () => {
    const params = setup({ existing: [] });

    await expect(hasPartialReadAccess({ ...params, indices: ['apm-*'] })).resolves.toBe(false);
    expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('excludes the Agent Builder indices from the OTel wildcards', async () => {
    const params = setup({ existing: ['traces-*.otel-*', 'logs-*.otel-*'] });

    await hasPartialReadAccess({ ...params, indices: ['logs-*.otel-*', 'traces-*.otel-*'] });

    expect(params.esClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
    expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [
        {
          names: [
            'logs-*.otel-*,-logs-agent_builder.otel-*',
            'traces-*.otel-*,-traces-agent_builder.otel-*',
          ],
          privileges: ['read'],
        },
      ],
    });
  });

  it('splits comma-separated patterns, deduplicates them and ignores exclusions', async () => {
    const params = setup({ existing: ['traces-apm*', 'logs-apm.error-*'] });

    await hasPartialReadAccess({
      ...params,
      indices: ['traces-apm*,logs-apm.error-*', 'traces-apm*', '-traces-apm.rum*'],
    });

    expect(params.internalEsClient.indices.resolveIndex).toHaveBeenCalledTimes(2);
    expect(params.esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['traces-apm*', 'logs-apm.error-*'], privileges: ['read'] }],
    });
  });

  it('returns false when the privilege check throws, as with security disabled', async () => {
    const params = setup({ existing: ['traces-apm*'] });
    params.esClient.security.hasPrivileges.mockRejectedValue(new Error('security disabled'));

    await expect(hasPartialReadAccess({ ...params, indices: ['traces-apm*'] })).resolves.toBe(
      false
    );
    expect(params.logger.debug).toHaveBeenCalledWith(expect.stringContaining('security disabled'));
  });

  it('returns false when resolving the patterns throws', async () => {
    const params = setup({ existing: [] });
    params.internalEsClient.indices.resolveIndex.mockRejectedValue(new Error('resolve failed'));

    await expect(hasPartialReadAccess({ ...params, indices: ['traces-apm*'] })).resolves.toBe(
      false
    );
    expect(params.esClient.security.hasPrivileges).not.toHaveBeenCalled();
    expect(params.logger.debug).toHaveBeenCalledWith(expect.stringContaining('resolve failed'));
  });
});
