/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourcesAccessPluginStart } from '@kbn/apm-sources-access-plugin/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import { createGetSourceTypePatterns } from './source_type_patterns';

const setup = ({
  logs,
  apm,
}: {
  logs?: { flattened?: string; error?: Error };
  apm?: { transaction?: string; span?: string; error?: Error };
} = {}) => {
  const soClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();
  const getFlattenedLogSources = jest.fn();
  if (logs?.error) {
    getFlattenedLogSources.mockRejectedValue(logs.error);
  } else {
    getFlattenedLogSources.mockResolvedValue(logs?.flattened ?? '');
  }
  const getLogSourcesService = jest.fn().mockResolvedValue({ getFlattenedLogSources });
  const getApmIndices = jest.fn();
  if (apm?.error) {
    getApmIndices.mockRejectedValue(apm.error);
  } else {
    getApmIndices.mockResolvedValue({
      transaction: apm?.transaction ?? '',
      span: apm?.span ?? '',
    });
  }

  const getSourceTypePatterns = createGetSourceTypePatterns({
    soClient,
    logger,
    logsDataAccess:
      logs === undefined
        ? undefined
        : ({
            services: { logSourcesServiceFactory: { getLogSourcesService } },
          } as unknown as LogsDataAccessPluginStart),
    apmSourcesAccess:
      apm === undefined ? undefined : ({ getApmIndices } as unknown as ApmSourcesAccessPluginStart),
  });

  return { getSourceTypePatterns, getLogSourcesService, getApmIndices, soClient, logger };
};

describe('createGetSourceTypePatterns', () => {
  it('reads configured log sources and APM trace indices', async () => {
    const { getSourceTypePatterns, getLogSourcesService, getApmIndices, soClient } = setup({
      logs: { flattened: 'logs-*, -logstash*, my-app-*' },
      apm: { transaction: 'traces-apm*,apm-*', span: 'apm-*,traces-*.otel-*' },
    });

    await expect(getSourceTypePatterns()).resolves.toEqual({
      logs: ['logs-*', 'my-app-*'],
      traces: ['traces-apm*', 'apm-*', 'traces-*.otel-*'],
    });
    expect(getLogSourcesService).toHaveBeenCalledWith(soClient);
    expect(getApmIndices).toHaveBeenCalledWith(soClient);
  });

  it('returns empty lists when neither plugin is available', async () => {
    const { getSourceTypePatterns, logger } = setup();

    await expect(getSourceTypePatterns()).resolves.toEqual({ logs: [], traces: [] });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keeps APM indices when log sources cannot be read', async () => {
    const { getSourceTypePatterns, logger } = setup({
      logs: { error: new Error('config forbidden') },
      apm: { transaction: 'apm-*', span: '' },
    });

    await expect(getSourceTypePatterns()).resolves.toEqual({ logs: [], traces: ['apm-*'] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('log sources'));
  });

  it('keeps log sources when APM indices cannot be read', async () => {
    const { getSourceTypePatterns, logger } = setup({
      logs: { flattened: 'my-app-*' },
      apm: { error: new Error('apm-indices forbidden') },
    });

    await expect(getSourceTypePatterns()).resolves.toEqual({ logs: ['my-app-*'], traces: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('APM indices'));
  });

  it('reads the settings once per client', async () => {
    const { getSourceTypePatterns, getLogSourcesService, getApmIndices } = setup({
      logs: { flattened: 'logs-*' },
      apm: { transaction: 'traces-*', span: 'traces-*' },
    });

    await getSourceTypePatterns();
    await getSourceTypePatterns();

    expect(getLogSourcesService).toHaveBeenCalledTimes(1);
    expect(getApmIndices).toHaveBeenCalledTimes(1);
  });
});
