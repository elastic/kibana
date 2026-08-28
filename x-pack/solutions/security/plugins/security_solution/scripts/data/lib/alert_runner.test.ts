/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import {
  ENDPOINT_SECURITY_RULE_ID,
  resolveEndpointSecurityRule,
  runAlertJobs,
  type RuleAlertJob,
} from './alert_runner';
import * as ruleset from './ruleset';

describe('resolveEndpointSecurityRule', () => {
  const log = new ToolingLog({
    level: 'silent',
    writeTo: { write: () => {} },
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes --rule-from into the stand-in rule create body', async () => {
    jest.spyOn(ruleset, 'findInstalledRuleByRuleId').mockResolvedValue(undefined);
    jest.spyOn(ruleset, 'fetchAllInstalledRules').mockResolvedValue([]);
    const create = jest.spyOn(ruleset, 'createCustomRule').mockResolvedValue({
      id: 'so-endpoint',
      rule_id: ENDPOINT_SECURITY_RULE_ID,
      name: 'Endpoint Security',
    });

    await resolveEndpointSecurityRule({
      kbnClient: {} as never,
      log,
      index: ['logs-endpoint.alerts.ns.2026.07.13'],
      ruleFrom: 'now-7d',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        rule: expect.objectContaining({
          from: 'now-7d',
          tags: expect.arrayContaining(['data-generator']),
        }),
      })
    );
  });
});

describe('runAlertJobs live mode wiring', () => {
  const log = new ToolingLog({
    level: 'silent',
    writeTo: { write: () => {} },
  });

  const jobs: RuleAlertJob[] = [
    {
      ruleRef: { id: 'so-1', rule_id: 'r1', name: 'Rule One' },
      index: ['logs-okta.system.2026.07.13'],
    },
  ];

  const tuning = {
    interval: '1h',
    invocationCount: 1,
    previewWindowSeconds: 3600,
    timeframeEndIso: '2026-07-13T00:00:00.000Z',
    timestampRange: { startMs: 0, endMs: 1 },
  };

  it('enables rules by default in live mode', async () => {
    const request = jest.fn().mockResolvedValue({ data: {} });
    const results = await runAlertJobs({
      esClient: {} as never,
      kbnClient: { request } as never,
      log,
      spaceId: 'default',
      alertMode: 'live',
      jobs,
      tuning,
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { action: 'enable', ids: ['so-1'] },
      })
    );
    expect(results).toEqual([{ rule: 'Rule One', count: 0 }]);
  });

  it('leaves rules disabled when leaveRulesDisabled is true', async () => {
    const request = jest.fn().mockResolvedValue({ data: {} });
    await runAlertJobs({
      esClient: {} as never,
      kbnClient: { request } as never,
      log,
      spaceId: 'default',
      alertMode: 'live',
      leaveRulesDisabled: true,
      jobs,
      tuning,
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { action: 'disable', ids: ['so-1'] },
      })
    );
  });

  it('returns zero counts without enable/disable when alert-mode is none', async () => {
    const request = jest.fn().mockResolvedValue({ data: {} });
    const results = await runAlertJobs({
      esClient: {} as never,
      kbnClient: { request } as never,
      log,
      spaceId: 'default',
      alertMode: 'none',
      jobs,
      tuning,
    });

    expect(request).not.toHaveBeenCalled();
    expect(results).toEqual([{ rule: 'Rule One', count: 0 }]);
  });
});
