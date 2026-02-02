/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScheduleUnit } from '../../../../common/runtime_types';
import type { NormalizedProjectProps } from './common_fields';
import {
  flattenAndFormatObject,
  getMonitorSchedule,
  getNormalizeCommonFields,
  getUrlsField,
  InvalidScheduleError,
  isValidURL,
} from './common_fields';

describe('isValidUrl', () => {
  it('returns false for invalid URL', () => {
    expect(isValidURL('invalid')).toBeFalsy();
  });

  it('returns true for valid URL', () => {
    expect(isValidURL('https://elastic.co')).toBeTruthy();
  });

  it('returns skips validation vars', () => {
    expect(isValidURL('${urlParam}')).toBeTruthy();
  });

  it('returns skips validation vars with http', () => {
    expect(isValidURL('http://${urlParam}')).toBeTruthy();
  });
});

describe('getUrlsField', () => {
  it('supports a string value containing a comma', () => {
    expect(getUrlsField('https://elastic.co?foo=bar,baz')).toEqual([
      'https://elastic.co?foo=bar,baz',
    ]);
  });

  it('supports lists containing exactly one entry, even with commas', () => {
    expect(getUrlsField(['https://elastic.co?foo=bar,baz'])).toEqual([
      'https://elastic.co?foo=bar,baz',
    ]);
  });
});

describe('normalizeYamlConfig', () => {
  it('does not continue flattening when encountering an array', () => {
    const array = ['value1', 'value2'];
    const supportedKeys: string[] = [];
    const nestedObject = {
      a: {
        nested: {
          key: array,
        },
      },
    };
    expect(flattenAndFormatObject(nestedObject, '', supportedKeys)).toEqual({
      'a.nested.key': array,
    });
  });

  it('does not continue flattening when encountering a supported key', () => {
    const supportedKeys: string[] = ['a.supported.key'];
    const object = {
      with: {
        further: {
          nesting: '',
        },
      },
    };
    const nestedObject = {
      a: {
        supported: {
          key: object,
        },
      },
    };
    expect(flattenAndFormatObject(nestedObject, '', supportedKeys)).toEqual({
      'a.supported.key': object,
    });
  });

  it('flattens objects', () => {
    const supportedKeys: string[] = [];
    const nestedObject = {
      a: {
        nested: {
          key: 'value1',
        },
      },
      b: {
        nested: {
          key: 'value2',
        },
      },
    };
    expect(flattenAndFormatObject(nestedObject, '', supportedKeys)).toEqual({
      'a.nested.key': 'value1',
      'b.nested.key': 'value2',
    });
  });
});

describe('getNormalizeCommonFields', () => {
  it.each([true, false, undefined, null])(
    'handles configuring monitor alert config when defined',
    (statusEnabled) => {
      const locations = [
        {
          label: 'US North America',
          id: 'us_central',
          isServiceManaged: true,
        },
      ];
      const config = {
        locations,
        privateLocations: [],
        projectId: 'test-projectId',
        monitor: {
          name: 'A monitor',
          id: 'test-id',
          type: 'http',
          urls: 'https://elastic.co',
          locations: ['us_central'],
          schedule: 3,
          alert: {
            status: {
              enabled: statusEnabled,
            },
          },
          maintenanceWindows: ['mw-1', 'mw-2'],
        },
        namespace: 'test-namespace',
        version: '8.7.0',
      };
      const normalizedFields = getNormalizeCommonFields(config as NormalizedProjectProps); // typecasting to allow testing of invalid user configs
      expect(normalizedFields).toEqual({
        errors: [],
        normalizedFields: {
          alert: {
            status: {
              enabled: statusEnabled ?? true,
            },
            tls: {
              enabled: true,
            },
          },
          custom_heartbeat_id: 'test-id-test-projectId-test-namespace',
          enabled: true,
          hash: '',
          journey_id: 'test-id',
          locations: [
            {
              geo: undefined,
              id: 'us_central',
              isServiceManaged: true,
              label: 'US North America',
            },
          ],
          name: 'A monitor',
          namespace: 'test_namespace',
          origin: 'project',
          original_space: 'test-namespace',
          project_id: 'test-projectId',
          schedule: {
            number: '3',
            unit: 'm',
          },
          tags: [],
          timeout: '16',
          params: '',
          max_attempts: 2,
          labels: {},
          maintenance_windows: ['mw-1', 'mw-2'],
          spaces: [],
        },
      });
    }
  );

  it('handles configuring monitor alert config when alert config is not defined', () => {
    const locations = [
      {
        label: 'US North America',
        id: 'us_central',
        isServiceManaged: true,
      },
    ];
    const config = {
      locations,
      privateLocations: [],
      projectId: 'test-projectId',
      monitor: {
        name: 'A monitor',
        id: 'test-id',
        type: 'http',
        urls: 'https://elastic.co',
        locations: ['us_central'],
        schedule: 3,
        maintenanceWindows: ['mw-3'],
      },
      namespace: 'test-namespace',
      version: '8.7.0',
    };
    const normalizedFields = getNormalizeCommonFields(config as NormalizedProjectProps); // typecasting to allow testing of invalid user configs
    expect(normalizedFields).toEqual({
      errors: [],
      normalizedFields: {
        alert: {
          status: {
            enabled: true,
          },
          tls: {
            enabled: true,
          },
        },
        custom_heartbeat_id: 'test-id-test-projectId-test-namespace',
        enabled: true,
        hash: '',
        journey_id: 'test-id',
        locations: [
          {
            geo: undefined,
            id: 'us_central',
            isServiceManaged: true,
            label: 'US North America',
          },
        ],
        name: 'A monitor',
        namespace: 'test_namespace',
        origin: 'project',
        original_space: 'test-namespace',
        project_id: 'test-projectId',
        schedule: {
          number: '3',
          unit: 'm',
        },
        tags: [],
        timeout: '16',
        params: '',
        max_attempts: 2,
        labels: {},
        maintenance_windows: ['mw-3'],
        spaces: [],
      },
    });
  });
});

describe('getMonitorSchedule', () => {
  it('should return default value if schedule is falsy', () => {
    const defaultValue = { number: '5', unit: ScheduleUnit.MINUTES };
    expect(getMonitorSchedule(null as any, defaultValue)).toEqual(defaultValue);
    expect(getMonitorSchedule(undefined as any, defaultValue)).toEqual(defaultValue);
  });

  it('should return a schedule object with minutes if schedule is a number', () => {
    expect(getMonitorSchedule(5)).toEqual({ number: '5', unit: ScheduleUnit.MINUTES });
  });

  it('should return a schedule object with minutes if schedule is a string without seconds', () => {
    expect(getMonitorSchedule('10')).toEqual({ number: '10', unit: ScheduleUnit.MINUTES });
  });

  it('should return a schedule object with seconds if schedule is allowed', () => {
    expect(getMonitorSchedule('10s')).toEqual({ number: '10', unit: ScheduleUnit.SECONDS });
    expect(getMonitorSchedule('30s')).toEqual({ number: '30', unit: ScheduleUnit.SECONDS });
  });

  it('should throw InvalidScheduleError if schedule in seconds is not allowed', () => {
    expect(() => getMonitorSchedule('20s')).toThrow(InvalidScheduleError);
  });

  it('should return the schedule object if schedule is already in the correct format', () => {
    const existingSchedule = { number: '15', unit: ScheduleUnit.MINUTES };
    expect(getMonitorSchedule(existingSchedule)).toEqual(existingSchedule);
  });
});
