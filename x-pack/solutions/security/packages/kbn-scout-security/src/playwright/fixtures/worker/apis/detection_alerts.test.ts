/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { EsClient, ScoutLogger } from '@kbn/scout';
import { getDetectionAlertsApiService } from './detection_alerts';

jest.mock('@kbn/scout', () => ({
  measurePerformanceAsync: <T>(_log: unknown, _label: string, fn: () => Promise<T>): Promise<T> =>
    fn(),
}));

const RULE_NAME = 'Test rule';

const createResponseError = (statusCode: number): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: `status_${statusCode}` } },
    headers: {},
    warnings: [],
    meta: {} as errors.ResponseError['meta']['meta'],
  });

const setup = () => {
  jest.useFakeTimers();
  const refresh = jest.fn().mockResolvedValue({});
  const count = jest.fn();
  const esClient = { indices: { refresh }, count } as unknown as EsClient;
  const log = { debug: jest.fn() } as unknown as ScoutLogger;
  const service = getDetectionAlertsApiService({ esClient, log });
  return { service, count };
};

describe('detectionAlerts.waitForAlerts', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('keeps polling after a 429 and resolves once the count is reached', async () => {
    const { service, count } = setup();
    count.mockRejectedValueOnce(createResponseError(429)).mockResolvedValueOnce({ count: 1 });

    const result = service.waitForAlerts(RULE_NAME, 1, 30_000);
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toBe(1);
    expect(count).toHaveBeenCalledTimes(2);
  });

  test('rejects on a 403 without polling again', async () => {
    const { service, count } = setup();
    const forbidden = createResponseError(403);
    count.mockRejectedValue(forbidden);

    await expect(service.waitForAlerts(RULE_NAME, 1, 30_000)).rejects.toBe(forbidden);
    expect(count).toHaveBeenCalledTimes(1);
  });

  test('includes the last retryable error when the timeout is reached', async () => {
    const { service, count } = setup();
    count.mockRejectedValue(createResponseError(429));

    const result = service.waitForAlerts(RULE_NAME, 1, 3_000);
    const assertion = expect(result).rejects.toThrow(/the last poll failed with: status_429/);
    await jest.advanceTimersByTimeAsync(3_000);

    await assertion;
  });

  test('reports a plain timeout when the last poll succeeded without enough alerts', async () => {
    const { service, count } = setup();
    count.mockRejectedValueOnce(createResponseError(429)).mockResolvedValue({ count: 0 });

    const result = service.waitForAlerts(RULE_NAME, 1, 3_000);
    const assertion = expect(result).rejects.toThrow(
      `waitForAlerts timed out after 3000ms: expected >=1 alert(s) for rule "${RULE_NAME}" in space "default"`
    );
    await jest.advanceTimersByTimeAsync(3_000);

    await assertion;
    await expect(result).rejects.not.toThrow(/last poll failed/);
  });
});
