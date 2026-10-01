/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsIndexFor, buildConfig, parseDuration, withRunTarget } from './config';

describe('parseDuration', () => {
  it.each([
    ['90s', 90_000],
    ['5m', 300_000],
    ['2h', 7_200_000],
    ['1d', 86_400_000],
    ['1.5h', 5_400_000],
  ])('parses %s', (raw, expected) => {
    expect(parseDuration(raw, 'duration')).toBe(expected);
  });

  it.each(['', '5', 'm', '5 minutes', '-5m'])('rejects "%s"', (raw) => {
    expect(() => parseDuration(raw, 'duration')).toThrow('Invalid --duration');
  });
});

describe('buildConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ES_API_KEY;
    delete process.env.ELASTIC_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to a single 100-alert burst against a local stack', () => {
    expect(buildConfig({}, [])).toMatchObject({
      command: 'run',
      mode: 'burst',
      ruleCount: 1,
      batchCount: 1,
      batchSize: 100,
      fpRate: 0.75,
      spaceId: 'default',
      kibanaUrl: 'http://127.0.0.1:5601',
      auth: { type: 'basic', username: 'elastic', password: 'changeme' },
      wait: true,
      dryRun: false,
    });
  });

  it('defaults a sustained run to 300 rules', () => {
    expect(buildConfig({ mode: 'sustained' }, [])).toMatchObject({
      mode: 'sustained',
      ruleCount: 300,
      alertsPerHour: 1000,
      durationMs: 3_600_000,
      ruleIntervalMs: 300_000,
      maxBatchSize: 100,
    });
  });

  it('takes the command from the first positional argument', () => {
    expect(buildConfig({}, ['clean']).command).toBe('clean');
  });

  it('rejects an unknown command and an unknown mode', () => {
    expect(() => buildConfig({}, ['destroy'])).toThrow('Unknown command');
    expect(() => buildConfig({ mode: 'steady' }, [])).toThrow('Invalid --mode');
  });

  it('rejects a non-numeric number', () => {
    expect(() => buildConfig({ 'batch-size': 'many' }, [])).toThrow('Invalid --batch-size');
  });

  it('uses an API key from the flag, stripped of its prefix', () => {
    expect(buildConfig({ apiKey: 'ApiKey abc123' }, []).auth).toEqual({
      type: 'apiKey',
      apiKey: 'abc123',
    });
  });

  it('uses an API key from the environment when there is no flag', () => {
    process.env.ES_API_KEY = 'fromenv';

    expect(buildConfig({}, []).auth).toEqual({ type: 'apiKey', apiKey: 'fromenv' });
  });

  it('turns waiting off with --no-wait', () => {
    expect(buildConfig({ wait: false }, []).wait).toBe(false);
  });

  it('splits the child workflow ids', () => {
    expect(buildConfig({ 'child-workflow-ids': 'a, b' }, []).childWorkflowIds).toEqual(['a', 'b']);
  });

  it('counts the analysis and proposal workflows by default', () => {
    expect(buildConfig({}, []).childWorkflowIds).toEqual([
      'system-security-alert-analysis',
      'system-create-alertzero-proposal',
    ]);
  });
});

describe('alertsIndexFor', () => {
  it('names the alerts index of the space', () => {
    expect(alertsIndexFor('default')).toBe('.alerts-security.alerts-default');
  });
});

describe('withRunTarget', () => {
  it('replaces the stack and space with the ones the run recorded', () => {
    const config = buildConfig({ kibanaUrl: 'http://localhost:5601', space: 'default' }, [
      'report',
    ]);

    const target = withRunTarget(config, {
      kibanaUrl: 'https://kb.example.com',
      elasticsearchUrl: 'https://es.example.com',
      spaceId: 'load-test',
    });

    expect(target).toMatchObject({
      kibanaUrl: 'https://kb.example.com',
      elasticsearchUrl: 'https://es.example.com',
      spaceId: 'load-test',
    });
  });

  it('keeps the credentials and options of the invocation', () => {
    const config = buildConfig({ apiKey: 'abc123', 'run-id': 'run-1' }, ['clean']);

    const target = withRunTarget(config, {
      kibanaUrl: 'https://kb.example.com',
      elasticsearchUrl: 'https://es.example.com',
      spaceId: 'load-test',
    });

    expect(target.auth).toEqual({ type: 'apiKey', apiKey: 'abc123' });
    expect(target).toMatchObject({ command: 'clean', runId: 'run-1' });
  });
});
