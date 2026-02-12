/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MonitorFields, ProjectMonitor } from '../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../common/runtime_types';
import {
  getBrowserTimeoutWarningForMonitor,
  getBrowserTimeoutWarningsForProjectMonitors,
} from './monitor_warnings';

describe('monitor warnings', () => {
  describe('getBrowserTimeoutWarningForMonitor', () => {
    it('returns warning for browser monitor with timeout and only public locations', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        [ConfigKey.TIMEOUT]: '60',
        locations: [{ id: 'us-east', isServiceManaged: true }],
      } as MonitorFields;

      expect(getBrowserTimeoutWarningForMonitor(monitor, 'monitor-id')).toEqual({
        id: 'monitor-id',
        message:
          'For browser monitors, timeout is only supported on private locations. Browser monitor monitor-id specifies a timeout but has no private locations configured, so the timeout will have no effect.',
      });
    });

    it('returns null when browser monitor has private locations', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        [ConfigKey.TIMEOUT]: '60',
        locations: [{ id: 'private-1', isServiceManaged: false }],
      } as MonitorFields;

      expect(getBrowserTimeoutWarningForMonitor(monitor, 'monitor-id')).toBeNull();
    });

    it('returns null when timeout is not provided', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        locations: [{ id: 'us-east', isServiceManaged: true }],
      } as MonitorFields;

      expect(getBrowserTimeoutWarningForMonitor(monitor, 'monitor-id')).toBeNull();
    });

    it('returns null for non-browser monitors', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
        [ConfigKey.TIMEOUT]: '60',
        locations: [{ id: 'us-east', isServiceManaged: true }],
      } as MonitorFields;

      expect(getBrowserTimeoutWarningForMonitor(monitor, 'monitor-id')).toBeNull();
    });
  });

  describe('getBrowserTimeoutWarningsForProjectMonitors', () => {
    it('returns warning for browser project monitor with timeout and no private locations', () => {
      const monitors = [
        {
          id: 'journey-1',
          type: MonitorTypeEnum.BROWSER,
          name: 'Browser monitor',
          schedule: '10',
          timeout: '60',
          privateLocations: [],
        } as ProjectMonitor,
      ];

      expect(getBrowserTimeoutWarningsForProjectMonitors(monitors)).toEqual([
        {
          id: 'journey-1',
          message:
            'For browser monitors, timeout is only supported on private locations. Browser monitor journey-1 specifies a timeout but has no private locations configured, so the timeout will have no effect.',
        },
      ]);
    });

    it('returns empty list when private locations are configured', () => {
      const monitors = [
        {
          id: 'journey-1',
          type: MonitorTypeEnum.BROWSER,
          name: 'Browser monitor',
          schedule: '10',
          timeout: '60',
          privateLocations: ['private-1'],
        } as ProjectMonitor,
      ];

      expect(getBrowserTimeoutWarningsForProjectMonitors(monitors)).toEqual([]);
    });
  });
});
