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

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*', 'filebeat-*', 'winlogbeat-*'],
      policySkipped: [],
    });
    expect(get).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reads the securitySolution:defaultIndex key', async () => {
    const { context, get } = makeContext(['logs-*']);
    const logger = loggingSystemMock.createLogger();

    await resolveHuntUniverse(context, logger, false);

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

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*'],
      policySkipped: [],
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(SECURITY_SOLUTION_DEFAULT_INDEX_ID)
    );
  });

  it('falls back to logs-* when the settings read throws rather than failing the hunt', async () => {
    const get = jest.fn().mockRejectedValue(new Error('uiSettings unavailable'));
    const context = { core: Promise.resolve({ uiSettings: { client: { get } } }) };
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*'],
      policySkipped: [],
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('uiSettings unavailable'));
  });

  it('passes exclusions through unchanged', async () => {
    const { context } = makeContext(['logs-*', '-*elastic-cloud-logs-*']);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*', '-*elastic-cloud-logs-*'],
      policySkipped: [],
    });
  });

  it('returns a fresh array each call so mutating the result does not change the fallback', async () => {
    const { context } = makeContext(undefined);
    const logger = loggingSystemMock.createLogger();

    const first = await resolveHuntUniverse(context, logger, false);
    first.patterns.push('mutated-*');

    expect(FALLBACK_HUNT_UNIVERSE).toEqual(['logs-*']);
    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*'],
      policySkipped: [],
    });
  });

  it('splits dot-prefixed positive entries into policySkipped', async () => {
    const { context } = makeContext(['logs-*', '.alerts-security.alerts-default', '-.alerts-x']);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*', '-.alerts-x'],
      policySkipped: ['.alerts-security.alerts-default'],
    });
  });

  it('reads a comma-joined entry as Elasticsearch does, so a hidden name inside one is still skipped', async () => {
    const { context } = makeContext([
      'logs-*, .alerts-security.alerts-default,-logs-elastic_agent*',
      'filebeat-*,,',
    ]);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*', '-logs-elastic_agent*', 'filebeat-*'],
      policySkipped: ['.alerts-security.alerts-default'],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('falls back to logs-* when the entries hold nothing but commas', async () => {
    const { context } = makeContext([' , ', ',']);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: ['logs-*'],
      policySkipped: [],
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns no fallback when every positive entry is skipped', async () => {
    const { context } = makeContext(['.siem-signals-infosec-detections']);
    const logger = loggingSystemMock.createLogger();

    await expect(resolveHuntUniverse(context, logger, false)).resolves.toEqual({
      patterns: [],
      policySkipped: ['.siem-signals-infosec-detections'],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
