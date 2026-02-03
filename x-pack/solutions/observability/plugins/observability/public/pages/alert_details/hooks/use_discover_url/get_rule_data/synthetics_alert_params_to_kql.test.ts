/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorStatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import moment, { type Moment } from 'moment';
import { syntheticsMonitorStatusAlertParamsToKqlQuery } from './synthetics_status_rule';
import { syntheticsTlsAlertParamsToKqlQuery } from './synthetics_tls_rule';

describe('synthetics_alert_params_to_kql', () => {
  const FIXED_DATE_ISO = '2025-09-04T20:52:38.662Z';
  const DAYS_TO_MS = 1000 * 60 * 60 * 24;

  beforeAll(() => {
    jest
      .spyOn(moment.prototype, 'subtract')
      .mockImplementation(function (this: Moment, ...args: unknown[]) {
        return new Date(new Date(FIXED_DATE_ISO).valueOf() - (args[0] as number) * DAYS_TO_MS);
      });
    jest
      .spyOn(moment.prototype, 'add')
      .mockImplementation(function (this: Moment, ...args: unknown[]) {
        return new Date(new Date(FIXED_DATE_ISO).valueOf() + (args[0] as number) * DAYS_TO_MS);
      });
  });

  afterAll(() => {
    // dateNowSpy.mockRestore();
    jest.restoreAllMocks();
  });
  describe('syntheticsMonitorStatusAlertParamsToKqlQuery', () => {
    it('should return a valid KQL query string for given params', () => {
      const params: SyntheticsMonitorStatusRuleParams = {
        monitorTypes: ['browser', 'http'],
        monitorIds: ['monitor-1', 'monitor-2'],
        locations: ['us-east-1', 'us-west-2'],
        projects: ['project-1'],
        tags: ['tag1', 'tag2'],
        condition: {
          groupBy: 'locationId',
          downThreshold: 3,
          window: { time: { size: 5, unit: 'm' } },
        },
        kqlQuery: 'monitor.status: "down"',
      };

      const kqlQuery = syntheticsMonitorStatusAlertParamsToKqlQuery(params);
      expect(kqlQuery).toMatchInlineSnapshot(
        `"(monitor.status: \\"down\\" AND (observer.name: us-east-1 OR observer.name: us-west-2) AND (monitor.id: monitor-1 OR monitor.id: monitor-2) AND (monitor.type: browser OR monitor.type: http) AND project.id: project-1 AND (tags: tag1 OR tags: tag2) AND monitor.status: down)"`
      );
    });

    it('should handle empty optional arrays gracefully', () => {
      const params: SyntheticsMonitorStatusRuleParams = {
        monitorTypes: [],
        monitorIds: ['monitor-1'],
        locations: [],
        projects: [],
        tags: ['tag1'],
        condition: {
          groupBy: 'locationId',
          downThreshold: 3,
          window: { time: { size: 5, unit: 'm' } },
        },
      };

      const kqlQuery = syntheticsMonitorStatusAlertParamsToKqlQuery(params);
      expect(kqlQuery).toMatchInlineSnapshot(
        `"(monitor.id: monitor-1 AND tags: tag1 AND monitor.status: down)"`
      );
    });

    it('should return only the status filter when no optional params are provided', () => {
      const params: SyntheticsMonitorStatusRuleParams = {
        condition: {
          groupBy: 'locationId',
          downThreshold: 3,
          window: { time: { size: 5, unit: 'm' } },
        },
      };

      const kqlQuery = syntheticsMonitorStatusAlertParamsToKqlQuery(params);
      expect(kqlQuery).toMatchInlineSnapshot(`"monitor.status: down"`);
    });
  });

  describe('syntheticsTlsAlertParamsToKqlQuery', () => {
    it('should return a valid KQL query string for given params', () => {
      const params: TLSRuleParams = {
        certAgeThreshold: 5,
        certExpirationThreshold: 10,
        search: 'example.com',
        monitorIds: ['monitor-1'],
        locations: ['us-east-1'],
        tags: ['tag1'],
        kqlQuery: 'tls.server.x509.not_after:now+10d',
      };

      const kqlQuery = syntheticsTlsAlertParamsToKqlQuery(params);
      expect(kqlQuery).toMatchInlineSnapshot(
        `"((tls.server.x509.not_after < 2025-09-14T20\\\\:52\\\\:38.662Z OR tls.server.x509.not_before < 2025-08-30T20\\\\:52\\\\:38.662Z) AND tls.server.x509.not_after: now+10d AND observer.name: us-east-1 AND monitor.id: monitor-1 AND tags: tag1)"`
      );
    });

    it('handles absence of expiration threshold', () => {
      const params: TLSRuleParams = {
        certAgeThreshold: 5,
      };
      const kqlQuery = syntheticsTlsAlertParamsToKqlQuery(params);
      expect(kqlQuery).toMatchInlineSnapshot(
        `"tls.server.x509.not_before < 2025-08-30T20\\\\:52\\\\:38.662Z"`
      );
    });

    it('handles absence of age threshold', () => {
      const params: TLSRuleParams = {
        certExpirationThreshold: 10,
      };
      const kqlQuery = syntheticsTlsAlertParamsToKqlQuery(params);
      expect(kqlQuery).toMatchInlineSnapshot(
        `"tls.server.x509.not_after < 2025-09-14T20\\\\:52\\\\:38.662Z"`
      );
    });

    it('returns empty string for empty params', () => {
      const result = syntheticsTlsAlertParamsToKqlQuery({});
      expect(result).toBe('');
    });
  });
});
