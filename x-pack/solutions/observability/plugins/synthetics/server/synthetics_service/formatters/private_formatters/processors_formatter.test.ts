/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processorsFormatter } from './processors_formatter';
import type { MonitorFields } from '../../../../common/runtime_types';
import { ConfigKey, ScheduleUnit } from '../../../../common/runtime_types';
import type { ProcessorFields } from './format_synthetics_policy';

const baseConfig = {
  [ConfigKey.SCHEDULE]: { number: '3', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LABELS]: {},
  [ConfigKey.KIBANA_SPACES]: [],
  config_id: 'test-config-id',
  test_run_id: '',
  run_once: false,
  'monitor.id': 'test-monitor-id',
  'monitor.project.name': 'test-project',
  'monitor.project.id': 'test-project-id',
  space_id: 'default',
  location_name: 'Test Location',
  location_id: 'loc-1',
} as unknown as MonitorFields & ProcessorFields;

describe('processorsFormatter', () => {
  it('includes kibanaUrl in add_fields when provided', () => {
    const config = {
      ...baseConfig,
      kibanaUrl: 'https://my-kibana.example.com',
    };

    const result = JSON.parse(processorsFormatter(config));
    expect(result).toHaveLength(1);
    expect(result[0].add_fields.fields.kibanaUrl).toBe('https://my-kibana.example.com');
  });

  it('omits kibanaUrl from add_fields when not provided', () => {
    const result = JSON.parse(processorsFormatter(baseConfig));
    expect(result).toHaveLength(1);
    expect(result[0].add_fields.fields).not.toHaveProperty('kibanaUrl');
  });

  it('omits kibanaUrl when it is an empty string', () => {
    const config = {
      ...baseConfig,
      kibanaUrl: '',
    };

    const result = JSON.parse(processorsFormatter(config));
    expect(result[0].add_fields.fields).not.toHaveProperty('kibanaUrl');
  });

  it('includes standard fields alongside kibanaUrl', () => {
    const config = {
      ...baseConfig,
      kibanaUrl: 'https://my-kibana.example.com',
    };

    const result = JSON.parse(processorsFormatter(config));
    const { fields } = result[0].add_fields;

    expect(fields['monitor.fleet_managed']).toBe(true);
    expect(fields.config_id).toBe('test-config-id');
    expect(fields['monitor.id']).toBe('test-monitor-id');
    expect(fields['monitor.project.name']).toBe('test-project');
    expect(fields['monitor.project.id']).toBe('test-project-id');
    expect(fields['monitor.interval']).toBe(180);
    expect(fields.meta.space_id).toBe('default');
    expect(fields.kibanaUrl).toBe('https://my-kibana.example.com');
  });

  it('includes labels when they are non-empty', () => {
    const config = {
      ...baseConfig,
      [ConfigKey.LABELS]: { env: 'production' },
    };

    const result = JSON.parse(processorsFormatter(config));
    expect(result[0].add_fields.fields.labels).toEqual({ env: 'production' });
  });

  it('merges kibana_spaces with space_id into meta.space_id', () => {
    const config = {
      ...baseConfig,
      [ConfigKey.KIBANA_SPACES]: ['space-a', 'space-b'],
    };

    const result = JSON.parse(processorsFormatter(config));
    expect(result[0].add_fields.fields.meta.space_id).toEqual(['default', 'space-a', 'space-b']);
  });
});
