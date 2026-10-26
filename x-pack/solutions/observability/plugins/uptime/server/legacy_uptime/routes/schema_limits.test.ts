/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UMServerLibs } from '../lib/lib';
import { DynamicSettingsSchema } from './dynamic_settings';
import { createGetPingsRoute } from './pings/get_pings';
import { createMonitorListRoute } from './monitors/monitor_list';
import {
  MAX_DATE_RANGE_LENGTH,
  MAX_FILTER_LENGTH,
  MAX_ID_LENGTH,
  MAX_SETTINGS_LIST_SIZE,
  MAX_SETTINGS_STRING_LENGTH,
  boundedString,
  boundedStringArray,
} from './schema_limits';

const libs = {} as UMServerLibs;

const querySchema = (route: { validate: unknown }) => {
  const validate = route.validate as { query: { validate: (value: unknown) => unknown } };
  return validate.query;
};

describe('legacy uptime route schema bounds', () => {
  it('accepts in-range ids and dates and rejects one character over the cap', () => {
    const id = boundedString(MAX_ID_LENGTH);
    expect(id.validate('a'.repeat(MAX_ID_LENGTH))).toBe('a'.repeat(MAX_ID_LENGTH));
    expect(() => id.validate('a'.repeat(MAX_ID_LENGTH + 1))).toThrow(/maximum length/);

    const pings = querySchema(createGetPingsRoute(libs));
    expect(
      pings.validate({
        from: 'now-15m',
        to: 'now',
        monitorId: 'my-monitor',
        sort: 'desc',
        status: 'up',
      })
    ).toEqual({
      from: 'now-15m',
      to: 'now',
      monitorId: 'my-monitor',
      sort: 'desc',
      status: 'up',
    });
    expect(() =>
      pings.validate({
        from: 'n'.repeat(MAX_DATE_RANGE_LENGTH + 1),
        to: 'now',
      })
    ).toThrow(/maximum length/);
  });

  it('caps monitor list filters and dynamic settings lists', () => {
    const monitors = querySchema(createMonitorListRoute(libs));
    expect(() =>
      monitors.validate({
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
        pageSize: 10,
        filters: 'f'.repeat(MAX_FILTER_LENGTH + 1),
      })
    ).toThrow(/maximum length/);

    const connectors = Array.from({ length: MAX_SETTINGS_LIST_SIZE }, (_, i) => `connector-${i}`);
    const saved = DynamicSettingsSchema.validate({ defaultConnectors: connectors });
    expect(saved.defaultConnectors).toHaveLength(MAX_SETTINGS_LIST_SIZE);
    expect(() =>
      DynamicSettingsSchema.validate({
        defaultConnectors: [...connectors, 'one-more'],
      })
    ).toThrow(/cannot be greater than/);
    expect(() =>
      DynamicSettingsSchema.validate({
        defaultEmail: { to: ['a'.repeat(MAX_SETTINGS_STRING_LENGTH + 1)] },
      })
    ).toThrow(/maximum length/);
    expect(() =>
      boundedStringArray(MAX_SETTINGS_STRING_LENGTH, MAX_SETTINGS_LIST_SIZE).validate(
        Array.from({ length: MAX_SETTINGS_LIST_SIZE + 1 }, () => 'x')
      )
    ).toThrow(/cannot be greater than/);
  });
});
