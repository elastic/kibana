/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import { getSourceTypePatterns } from './get_source_type_patterns';

const logsPlugin = (flattened: string | Error): LogsDataAccessPluginStart => {
  const getFlattenedLogSources =
    flattened instanceof Error
      ? jest.fn().mockRejectedValue(flattened)
      : jest.fn().mockResolvedValue(flattened);
  return {
    services: { logSourcesService: { getFlattenedLogSources } },
  } as unknown as LogsDataAccessPluginStart;
};

const apmPlugin = (
  indices: { transaction: string; span: string } | Error
): ApmSourceAccessPluginStart => {
  const getApmIndices =
    indices instanceof Error
      ? jest.fn().mockRejectedValue(indices)
      : jest.fn().mockResolvedValue(indices);
  return { getApmIndices } as unknown as ApmSourceAccessPluginStart;
};

describe('getSourceTypePatterns', () => {
  it('reads log sources and APM trace indices', async () => {
    const logsDataAccess = logsPlugin('logs-*, -logstash*, my-app-*');
    const apmSourcesAccess = apmPlugin({
      transaction: 'traces-apm*,apm-*',
      span: 'apm-*,traces-*.otel-*',
    });

    await expect(getSourceTypePatterns({ logsDataAccess, apmSourcesAccess })).resolves.toEqual({
      logs: ['logs-*', 'my-app-*'],
      traces: ['traces-apm*', 'apm-*', 'traces-*.otel-*'],
    });
  });

  it('returns empty lists when neither plugin is installed', async () => {
    await expect(getSourceTypePatterns({})).resolves.toEqual({ logs: [], traces: [] });
  });

  it('returns empty logs when only APM is installed', async () => {
    await expect(
      getSourceTypePatterns({ apmSourcesAccess: apmPlugin({ transaction: 'apm-*', span: '' }) })
    ).resolves.toEqual({ logs: [], traces: ['apm-*'] });
  });

  it('returns null when an installed plugin fails', async () => {
    await expect(
      getSourceTypePatterns({
        logsDataAccess: logsPlugin('logs-*'),
        apmSourcesAccess: apmPlugin(new Error('apm forbidden')),
      })
    ).resolves.toBeNull();
  });

  it('asks for APM indices on every call', async () => {
    const apmSourcesAccess = apmPlugin({ transaction: 'traces-*', span: '' });

    await getSourceTypePatterns({ apmSourcesAccess });
    await getSourceTypePatterns({ apmSourcesAccess });

    expect(apmSourcesAccess.getApmIndices).toHaveBeenCalledTimes(2);
  });
});
