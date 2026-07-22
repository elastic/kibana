/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { runTask } from './extract_entity_task';
import { createLogsExtractionClient } from './factories';

jest.mock('./factories');
jest.mock('../monitor/metrics', () => ({
  entityStoreMetrics: {
    extractionTaskSuccess: { add: jest.fn() },
    extractionTaskError: { add: jest.fn() },
  },
}));

const mockCreateLogsExtractionClient = createLogsExtractionClient as jest.MockedFunction<
  typeof createLogsExtractionClient
>;

type RunTaskArgs = Parameters<typeof runTask>[0];

const runExtractTask = ({
  currentInterval,
  nextInterval,
}: {
  currentInterval: string;
  nextInterval: string;
}) => {
  const logsExtractionClient = {
    extractLogs: jest.fn().mockResolvedValue({ success: true, isRemote: false, count: 1 }),
    globalStateClient: {
      find: jest.fn().mockResolvedValue({ logsExtraction: { frequency: nextInterval } }),
    },
  };
  mockCreateLogsExtractionClient.mockResolvedValue({
    logsExtractionClient,
  } as unknown as Awaited<ReturnType<typeof createLogsExtractionClient>>);

  return runTask({
    taskInstance: {
      id: 'extract:host:default',
      state: { namespace: 'default', runs: 0 },
      schedule: { interval: currentInterval },
    },
    fakeRequest: {},
    abortController: new AbortController(),
    entityType: 'host',
    logger: loggerMock.create(),
    core: {},
    isServerless: false,
  } as unknown as RunTaskArgs);
};

describe('extract entity task - self-heal schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reschedules itself to the next interval when the current interval has drifted', async () => {
    const result = await runExtractTask({ currentInterval: '1m', nextInterval: '2m' });

    expect(result.schedule).toEqual({ interval: '2m' });
  });

  it('does not reschedule when the current interval already matches the next interval', async () => {
    const result = await runExtractTask({ currentInterval: '2m', nextInterval: '2m' });

    expect(result.schedule).toBeUndefined();
  });
});
