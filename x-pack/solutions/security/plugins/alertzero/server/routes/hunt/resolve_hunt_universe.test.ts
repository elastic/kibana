/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import { FALLBACK_HUNT_UNIVERSE, resolveHuntUniverse } from './resolve_hunt_universe';

const makeContext = (value: unknown) => {
  const get = jest.fn().mockResolvedValue(value);
  return {
    context: {
      core: Promise.resolve({ uiSettings: { client: { get } } }),
    },
    get,
  };
};

describe('resolveHuntUniverse', () => {
  it('returns the configured list with entries trimmed', async () => {
    const { context, get } = makeContext([' logs-* ', 'filebeat-*', ' winlogbeat-* ']);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger)).resolves.toEqual([
      'logs-*',
      'filebeat-*',
      'winlogbeat-*',
    ]);
    expect(get).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reads the securitySolution:defaultIndex key', async () => {
    const { context, get } = makeContext(['logs-*']);
    const logger = loggingSystemMock.createLogger();

    await resolveHuntUniverse(context, logger);

    expect(get).toHaveBeenCalledWith('securitySolution:defaultIndex');
    expect(SECURITY_SOLUTION_DEFAULT_INDEX_ID).toBe('securitySolution:defaultIndex');
  });

  it.each([
    ['undefined', undefined],
    ['not an array', 'logs-*'],
    ['an empty array', []],
    ['a non-string entry', ['logs-*', 1]],
    ['a blank entry', ['logs-*', '  ']],
  ])('falls back to logs-* and warns once when the setting is %s', async (_label, value) => {
    const { context } = makeContext(value);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger)).resolves.toEqual(['logs-*']);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(SECURITY_SOLUTION_DEFAULT_INDEX_ID)
    );
  });

  it('passes exclusions through unchanged', async () => {
    const { context } = makeContext(['logs-*', '-*elastic-cloud-logs-*']);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger)).resolves.toEqual([
      'logs-*',
      '-*elastic-cloud-logs-*',
    ]);
  });

  it('returns a fresh array each call so mutating the result does not change the fallback', async () => {
    const { context } = makeContext(undefined);
    const logger = loggingSystemMock.createLogger();

    const first = await resolveHuntUniverse(context, logger);
    first.push('mutated-*');

    expect(FALLBACK_HUNT_UNIVERSE).toEqual(['logs-*']);
    await expect(resolveHuntUniverse(context, logger)).resolves.toEqual(['logs-*']);
  });
});
