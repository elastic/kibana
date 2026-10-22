/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import {
  MAX_MONITOR_FANOUT_SIZE,
  MAX_PARAM_VALUE_LENGTH,
  MAX_ROUTE_STRING_LENGTH,
} from '../../../common/constants/monitor_attribute_limits';
import { secretKeys } from '../../../common/constants/monitor_management';
import {
  fullBrowserMonitor,
  fullHttpMonitor,
  fullIcmpMonitor,
  fullTcpMonitor,
} from '../../../common/runtime_types/test_helpers/monitor_fixtures';
import { browserMonitorFixture } from '../../../test/scout/common/fixtures/data/browser_monitor';
import { httpMonitorFixture } from '../../../test/scout/common/fixtures/data/http_monitor';
import { icmpMonitorFixture } from '../../../test/scout/monitor_crud/api/fixtures/data/icmp_monitor';
import { tcpMonitorFixture } from '../../../test/scout/monitor_crud/api/fixtures/data/tcp_monitor';
import { monitorCreateSchema, monitorForwardCompatibilitySchema } from './monitor_attribute_schema';

const apiMonitorFixture = omit(browserMonitorFixture, ['screenshots', 'throttling']);

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
  it.each(Object.entries(storedMonitors))('accepts a full %s monitor', (_type, monitor) => {
    expect(monitorCreateSchema.validate(monitor)).toEqual(monitor);
  });

  it.each([
    ['http', httpMonitorFixture],
    ['tcp', tcpMonitorFixture],
    ['icmp', icmpMonitorFixture],
    ['browser', browserMonitorFixture],
    ['api', apiMonitorFixture],
  ])('accepts the %s monitor fixture', (_type, monitor) => {
    expect(monitorCreateSchema.validate(monitor)).toEqual(monitor);
  });

  it('accepts a monitor after secret fields are packed into secrets', () => {
    const stored = withPackedSecrets(fullHttpMonitor());

    expect(monitorCreateSchema.validate(stored)).toEqual(stored);
  });

  it('accepts a name and tag list a project push can already store', () => {
    const monitor = {
      ...fullHttpMonitor(),
      name: 'n'.repeat(MAX_ROUTE_STRING_LENGTH + 1),
      tags: Array.from({ length: MAX_MONITOR_FANOUT_SIZE + 1 }, (_, index) =>
        index === 0 ? 't'.repeat(MAX_ROUTE_STRING_LENGTH + 1) : 'tag'
      ),
    };

    expect(monitorCreateSchema.validate(monitor)).toEqual(monitor);
  });

  it('accepts a screenshots value the browser codec already allows', () => {
    const monitor = {
      ...fullBrowserMonitor(),
      screenshots: 'false',
    };

    expect(monitorCreateSchema.validate(monitor)).toEqual(monitor);
  });

  it('accepts a secrets string larger than one secret field', () => {
    const stored = {
      ...withPackedSecrets(fullHttpMonitor()),
      secrets: 'x'.repeat(MAX_PARAM_VALUE_LENGTH * 8 + 1),
    };

    expect(monitorCreateSchema.validate(stored)).toEqual(stored);
  });

  it('rejects an attribute this version does not store', () => {
    expect(() =>
      monitorCreateSchema.validate({
        ...withPackedSecrets(fullHttpMonitor()),
        schedule_interval_seconds: 10,
      })
    ).toThrow(/schedule_interval_seconds/);
  });

  it('rejects a value of the wrong type', () => {
    expect(() =>
      monitorCreateSchema.validate({
        ...fullIcmpMonitor(),
        enabled: { bad: true },
      })
    ).toThrow(/enabled/);
  });

  it('drops attributes added by a later version and keeps stored fields', () => {
    const stored = withPackedSecrets(fullBrowserMonitor());

    expect(
      monitorForwardCompatibilitySchema.validate({
        ...stored,
        schedule_interval_seconds: 600,
      })
    ).toEqual(stored);
  });
});
