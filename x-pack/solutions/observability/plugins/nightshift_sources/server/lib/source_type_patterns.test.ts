/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourcesAccessPluginStart } from '@kbn/apm-sources-access-plugin/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import type { ApmIndexPatternFields } from '@kbn/nightshift-shared';
import { createGetSourceTypePatterns } from './source_type_patterns';

const setup = ({
  logs,
  apm,
}: {
  logs?: { flattened?: string; error?: Error };
  apm?: {
    transaction?: string;
    span?: string;
    error?: string;
    metric?: string;
    failure?: Error;
    fromConfig?: ApmIndexPatternFields;
  };
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
  if (apm?.failure) {
    getApmIndices.mockRejectedValue(apm.failure);
  } else {
    getApmIndices.mockResolvedValue({
      transaction: apm?.transaction ?? '',
      span: apm?.span ?? '',
      error: apm?.error ?? '',
      metric: apm?.metric ?? '',
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
    apmIndicesFromConfig: apm?.fromConfig,
  });

  return {
    getSourceTypePatterns,
    getLogSourcesService,
    getApmIndices,
    soClient,
    logger,
  };
};

describe('createGetSourceTypePatterns', () => {
  it('reads configured log sources and APM indices, including error and metric', async () => {
    const { getSourceTypePatterns, getLogSourcesService, getApmIndices, soClient } = setup({
      logs: { flattened: 'logs-*, -logstash*, my-app-*' },
      apm: {
        transaction: 'traces-apm*,apm-*',
        span: 'apm-*,traces-*.otel-*',
        error: 'logs-apm*,apm-*',
        metric: 'metrics-apm*,apm-*',
      },
    });

    await expect(getSourceTypePatterns()).resolves.toEqual({
      logs: ['logs-*', 'my-app-*', 'logs-apm*', 'apm-*'],
      traces: ['traces-apm*', 'apm-*', 'traces-*.otel-*'],
      metrics: ['metrics-apm*', 'apm-*'],
    });
    expect(getLogSourcesService).toHaveBeenCalledWith(soClient);
    expect(getApmIndices).toHaveBeenCalledWith(soClient);
  });

  it('returns empty lists when neither plugin is available', async () => {
    const { getSourceTypePatterns, logger } = setup();

    await expect(getSourceTypePatterns()).resolves.toEqual({
      logs: [],
      traces: [],
      metrics: [],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses the APM plugin config when the saved object is forbidden', async () => {
    const { getSourceTypePatterns, logger } = setup({
      logs: { flattened: 'my-app-*' },
      apm: {
        failure: SavedObjectsErrorHelpers.decorateForbiddenError(new Error('unauthorized')),
        fromConfig: {
          transaction: 'traces-custom-*',
          span: '',
          error: 'logs-custom-*',
          metric: 'metrics-custom-*',
        },
      },
    });

    await expect(getSourceTypePatterns()).resolves.toEqual({
      logs: ['my-app-*', 'logs-custom-*'],
      traces: ['traces-custom-*'],
      metrics: ['metrics-custom-*'],
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('configured defaults'));
  });

  it('rejects a forbidden APM read when the plugin config was not captured', async () => {
    const { getSourceTypePatterns, logger } = setup({
      logs: { flattened: 'my-app-*' },
      apm: {
        failure: SavedObjectsErrorHelpers.decorateForbiddenError(new Error('unauthorized')),
      },
    });

    await expect(getSourceTypePatterns()).rejects.toThrow('unauthorized');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rejects when log sources cannot be read', async () => {
    const { getSourceTypePatterns } = setup({
      logs: { error: new Error('config forbidden') },
      apm: { transaction: 'apm-*', span: '' },
    });

    await expect(getSourceTypePatterns()).rejects.toThrow('config forbidden');
  });

  it('rejects when APM indices fail for a reason other than forbidden', async () => {
    const { getSourceTypePatterns, logger } = setup({
      logs: { flattened: 'my-app-*' },
      apm: { failure: new Error('apm-indices down') },
    });

    await expect(getSourceTypePatterns()).rejects.toThrow('apm-indices down');
    expect(logger.warn).not.toHaveBeenCalled();
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
