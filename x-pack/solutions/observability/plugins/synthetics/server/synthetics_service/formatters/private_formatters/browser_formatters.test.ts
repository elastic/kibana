/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';
import { browserTimeoutFormatterPrivate, throttlingFormatter } from './browser_formatters';

describe('formatters', () => {
  describe('throttling formatter', () => {
    it('formats for no throttling', () => {
      expect(
        throttlingFormatter!(
          {
            [ConfigKey.THROTTLING_CONFIG]: {
              value: {
                download: '0',
                upload: '0',
                latency: '0',
              },
              label: 'No throttling',
              id: 'no-throttling',
            },
          },
          ConfigKey.THROTTLING_CONFIG
        )
      ).toEqual('false');
    });

    it('formats for default throttling', () => {
      expect(
        throttlingFormatter!(
          {
            [ConfigKey.THROTTLING_CONFIG]: {
              value: {
                download: '5',
                upload: '3',
                latency: '20',
              },
              label: 'Default',
              id: 'default',
            },
          },
          ConfigKey.THROTTLING_CONFIG
        )
      ).toEqual(JSON.stringify({ download: 5, upload: 3, latency: 20 }));
    });

    it('formats for custom throttling', () => {
      expect(
        throttlingFormatter!(
          {
            [ConfigKey.THROTTLING_CONFIG]: {
              value: {
                download: '1.25',
                upload: '0.75',
                latency: '150',
              },
              label: 'Custom',
              id: 'custom',
            },
          },
          ConfigKey.THROTTLING_CONFIG
        )
      ).toEqual(JSON.stringify({ download: 1.25, upload: 0.75, latency: 150 }));
    });
  });

  describe('timeout formatter', () => {
    it('subtracts heartbeat overhead for browser monitors', () => {
      expect(
        browserTimeoutFormatterPrivate!(
          {
            [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
            [ConfigKey.TIMEOUT]: '60',
          },
          ConfigKey.TIMEOUT
        )
      ).toEqual('30s');
    });

    it('returns zero overhead for timeouts greater than the Heartbeat overhead (safeguard against negative timeouts)', () => {
      expect(
        browserTimeoutFormatterPrivate!(
          {
            [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
            [ConfigKey.TIMEOUT]: '0',
          },
          ConfigKey.TIMEOUT
        )
      ).toEqual('0s');
    });

    it('returns raw timeout for non-browser monitors', () => {
      expect(
        browserTimeoutFormatterPrivate!(
          {
            [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
            [ConfigKey.TIMEOUT]: '45',
          },
          ConfigKey.TIMEOUT
        )
      ).toEqual('45s');
    });
  });
});
