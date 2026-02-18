/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MonitorFields, ProjectMonitor } from '../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../common/runtime_types';
import {
  BROWSER_TIMEOUT_AGENT_VERSION_THRESHOLD,
  HEARTBEAT_BROWSER_MONITOR_TIMEOUT_OVERHEAD_SECONDS,
} from '../../../common/constants/monitor_defaults';
import {
  getBrowserTimeoutWarningForMonitor,
  getBrowserTimeoutWarningsForProjectMonitors,
  getBrowserTimeoutAgentVersionWarningForMonitor,
  getBrowserTimeoutAgentVersionWarningsForProjectMonitors,
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
        monitorId: 'monitor-id',
        message:
          'For browser monitors, timeout is only supported on private locations. Browser monitor monitor-id specifies a timeout and is running on public locations: us-east. The timeout will have no effect on these locations.',
        publicLocationIds: ['us-east'],
      });
    });

    it('returns null when browser monitor has no public locations', () => {
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
    it('returns warning for browser project monitor with timeout and public locations', () => {
      const monitors = [
        {
          id: 'journey-1',
          type: MonitorTypeEnum.BROWSER,
          name: 'Browser monitor',
          schedule: '10',
          timeout: '60',
          privateLocations: ['private-1'],
          locations: ['public-1'],
        } as ProjectMonitor,
      ];

      expect(getBrowserTimeoutWarningsForProjectMonitors(monitors)).toEqual([
        {
          monitorId: 'journey-1',
          message:
            'For browser monitors, timeout is only supported on private locations. Browser monitor journey-1 specifies a timeout and is running on public locations: public-1. The timeout will have no effect on these locations.',
          publicLocationIds: ['public-1'],
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

  describe('getBrowserTimeoutAgentVersionWarningForMonitor', () => {
    it('returns warning for browser monitor with timeout and private locations', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        [ConfigKey.TIMEOUT]: '60',
        locations: [{ id: 'private-1', isServiceManaged: false }],
      } as MonitorFields;

      const warning = getBrowserTimeoutAgentVersionWarningForMonitor(monitor, 'monitor-id');
      expect(warning).not.toBeNull();
      expect(warning!.monitorId).toBe('monitor-id');
      expect(warning!.message).toContain(BROWSER_TIMEOUT_AGENT_VERSION_THRESHOLD);
      expect(warning!.message).toContain(
        String(HEARTBEAT_BROWSER_MONITOR_TIMEOUT_OVERHEAD_SECONDS)
      );
    });

    it('returns warning when monitor has both public and private locations', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        [ConfigKey.TIMEOUT]: '60',
        locations: [
          { id: 'us-east', isServiceManaged: true },
          { id: 'private-1', isServiceManaged: false },
        ],
      } as MonitorFields;

      const warning = getBrowserTimeoutAgentVersionWarningForMonitor(monitor, 'monitor-id');
      expect(warning).not.toBeNull();
    });

    it('returns null when browser monitor has only public locations', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        [ConfigKey.TIMEOUT]: '60',
        locations: [{ id: 'us-east', isServiceManaged: true }],
      } as MonitorFields;

      expect(getBrowserTimeoutAgentVersionWarningForMonitor(monitor, 'monitor-id')).toBeNull();
    });

    it('returns null when timeout is not provided', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        locations: [{ id: 'private-1', isServiceManaged: false }],
      } as MonitorFields;

      expect(getBrowserTimeoutAgentVersionWarningForMonitor(monitor, 'monitor-id')).toBeNull();
    });

    it('returns null for non-browser monitors', () => {
      const monitor = {
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
        [ConfigKey.TIMEOUT]: '60',
        locations: [{ id: 'private-1', isServiceManaged: false }],
      } as MonitorFields;

      expect(getBrowserTimeoutAgentVersionWarningForMonitor(monitor, 'monitor-id')).toBeNull();
    });
  });

  describe('getBrowserTimeoutAgentVersionWarningsForProjectMonitors', () => {
    it('returns warning for browser project monitor with timeout and private locations', () => {
      const monitors = [
        {
          id: 'journey-1',
          type: MonitorTypeEnum.BROWSER,
          name: 'Browser monitor',
          schedule: '10',
          timeout: '60',
          privateLocations: ['private-1'],
          locations: ['public-1'],
        } as ProjectMonitor,
      ];

      const warnings = getBrowserTimeoutAgentVersionWarningsForProjectMonitors(monitors);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].monitorId).toBe('journey-1');
      expect(warnings[0].message).toContain(BROWSER_TIMEOUT_AGENT_VERSION_THRESHOLD);
    });

    it('returns empty list when no private locations', () => {
      const monitors = [
        {
          id: 'journey-1',
          type: MonitorTypeEnum.BROWSER,
          name: 'Browser monitor',
          schedule: '10',
          timeout: '60',
          locations: ['public-1'],
        } as ProjectMonitor,
      ];

      expect(getBrowserTimeoutAgentVersionWarningsForProjectMonitors(monitors)).toEqual([]);
    });

    it('returns empty list when no timeout', () => {
      const monitors = [
        {
          id: 'journey-1',
          type: MonitorTypeEnum.BROWSER,
          name: 'Browser monitor',
          schedule: '10',
          privateLocations: ['private-1'],
        } as ProjectMonitor,
      ];

      expect(getBrowserTimeoutAgentVersionWarningsForProjectMonitors(monitors)).toEqual([]);
    });
  });
});
