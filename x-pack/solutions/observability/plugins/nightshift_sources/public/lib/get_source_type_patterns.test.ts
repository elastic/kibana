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

const forbidden = (): Error => {
  const error = new Error('forbidden') as Error & { response: { status: number } };
  Object.assign(error, { request: {}, response: { status: 403 } });
  return error;
};

const apmPlugin = (
  indices: { transaction?: string; span?: string; error?: string; metric?: string } | Error
): ApmSourceAccessPluginStart => {
  const getApmIndices =
    indices instanceof Error
      ? jest.fn().mockRejectedValue(indices)
      : jest.fn().mockResolvedValue({
          transaction: indices.transaction ?? '',
          span: indices.span ?? '',
          error: indices.error ?? '',
          metric: indices.metric ?? '',
        });
  return { getApmIndices } as unknown as ApmSourceAccessPluginStart;
};

describe('getSourceTypePatterns', () => {
  it('reads log sources and APM indices, including error and metric', async () => {
    const logsDataAccess = logsPlugin('logs-*, -logstash*, my-app-*');
    const apmSourcesAccess = apmPlugin({
      transaction: 'traces-apm*,apm-*',
      span: 'apm-*,traces-*.otel-*',
      error: 'logs-apm*,apm-*',
      metric: 'metrics-apm*,apm-*',
    });

    await expect(getSourceTypePatterns({ logsDataAccess, apmSourcesAccess })).resolves.toEqual({
      logs: ['logs-*', 'my-app-*', 'logs-apm*', 'apm-*'],
      traces: ['traces-apm*', 'apm-*', 'traces-*.otel-*'],
      metrics: ['metrics-apm*', 'apm-*'],
    });
  });

  it('returns empty lists when neither plugin is installed', async () => {
    await expect(getSourceTypePatterns({})).resolves.toEqual({
      logs: [],
      traces: [],
      metrics: [],
    });
  });

  it('returns empty logs when only APM is installed', async () => {
    await expect(
      getSourceTypePatterns({ apmSourcesAccess: apmPlugin({ transaction: 'apm-*', span: '' }) })
    ).resolves.toEqual({ logs: [], traces: ['apm-*'], metrics: [] });
  });

  it('keeps log sources and uses default APM patterns when APM responds 403', async () => {
    const logsDataAccess = logsPlugin('my-app-*');

    await expect(
      getSourceTypePatterns({
        logsDataAccess,
        apmSourcesAccess: apmPlugin(forbidden()),
      })
    ).resolves.toEqual({
      logs: ['my-app-*', 'logs-apm*', 'apm-*', 'logs-*.otel-*'],
      traces: ['traces-apm*', 'apm-*', 'traces-*.otel-*'],
      metrics: ['metrics-apm*', 'apm-*', 'metrics-*.otel-*'],
    });
  });

  it('returns null when an installed plugin fails for another reason', async () => {
    await expect(
      getSourceTypePatterns({
        logsDataAccess: logsPlugin('logs-*'),
        apmSourcesAccess: apmPlugin(new Error('apm down')),
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
