/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import { ConfigKey, secretKeys } from '../../../common/constants/monitor_management';
import {
  fullBrowserMonitor,
  fullHttpMonitor,
  fullIcmpMonitor,
  fullTcpMonitor,
} from '../../../common/runtime_types/test_helpers/monitor_fixtures';
import {
  MONITOR_ATTRIBUTE_KEYS,
  monitorCreateSchema,
  monitorForwardCompatibilitySchema,
} from './monitor_attribute_schema';

const storedMonitors = {
  http: fullHttpMonitor(),
  tcp: fullTcpMonitor(),
  icmp: fullIcmpMonitor(),
  browser: fullBrowserMonitor(),
  api: {
    ...omit(fullBrowserMonitor(), ['screenshots', 'throttling']),
    type: 'api',
    form_monitor_type: 'api',
  },
};

const withPackedSecrets = (monitor: Record<string, unknown>) => ({
  ...omit(monitor, secretKeys),
  secrets: JSON.stringify(pick(monitor, secretKeys)),
});

describe('monitor attribute schema', () => {
  it('declares every ConfigKey, secrets and retest_on_failure', () => {
    const declared = Object.keys(monitorCreateSchema.getPropSchemas());

    expect(declared.sort()).toEqual(MONITOR_ATTRIBUTE_KEYS.slice().sort());
    expect(Object.values(ConfigKey).filter((key) => !declared.includes(key))).toEqual([]);
    expect(declared).toEqual(expect.arrayContaining(['secrets', 'retest_on_failure']));
  });

  it.each(Object.entries(storedMonitors))('accepts a full %s monitor', (_type, monitor) => {
    expect(monitorCreateSchema.validate(monitor)).toEqual(monitor);
  });

  it.each(Object.entries(storedMonitors))(
    'accepts a %s monitor after secrets are packed',
    (_type, monitor) => {
      const stored = withPackedSecrets(monitor);

      expect(monitorCreateSchema.validate(stored)).toEqual(stored);
    }
  );

  it('does not check values, so a stored document is never rejected for one', () => {
    const monitor = {
      ...fullHttpMonitor(),
      name: 'n'.repeat(1_000_000),
      enabled: { unexpected: true },
      schedule: 'not an object',
      tags: null,
    };

    expect(monitorCreateSchema.validate(monitor)).toEqual(monitor);
    expect(monitorForwardCompatibilitySchema.validate(monitor)).toEqual(monitor);
  });

  it('accepts a monitor that omits keys', () => {
    expect(monitorCreateSchema.validate({})).toEqual({});
    expect(monitorForwardCompatibilitySchema.validate({})).toEqual({});
  });

  it('create rejects an attribute this version does not store', () => {
    expect(() =>
      monitorCreateSchema.validate({
        ...withPackedSecrets(fullHttpMonitor()),
        schedule_interval_seconds: 10,
      })
    ).toThrow(/schedule_interval_seconds/);
  });

  it('forwardCompatibility drops attributes added by a later version and keeps the rest', () => {
    const stored = withPackedSecrets(fullBrowserMonitor());

    expect(
      monitorForwardCompatibilitySchema.validate({
        ...stored,
        schedule_interval_seconds: 600,
      })
    ).toEqual(stored);
  });

  it('forwardCompatibility keeps nested keys a later version added, so AAD still matches', () => {
    const stored = {
      ...fullHttpMonitor(),
      schedule: { number: '10', unit: 'm', interval_s: 600 },
    };

    expect(monitorForwardCompatibilitySchema.validate(stored)).toEqual(stored);
  });
});
