/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import {
  REPORT_EMAIL_CONNECTORS_ENDPOINT,
  SCHEDULED_REPORTS_CREATE_ENDPOINT,
  SCHEDULED_REPORTS_LIST_ENDPOINT,
  SCHEDULED_REPORT_DELETE_ENDPOINT,
  SCHEDULED_REPORT_RUN_ENDPOINT,
  SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
  SCHEDULED_REPORT_UPDATE_ENDPOINT,
  scheduledReportsRouteRepository,
} from './scheduled_routes';

describe('scheduledReportsRouteRepository', () => {
  const validBody = {
    reportType: 'scorecard' as const,
    name: 'Weekly scorecard: shop',
    lookbackDays: 7,
    schedule: {
      frequency: 'WEEKLY' as const,
      weekday: 'MO' as const,
      hour: 9,
      minute: 0,
      timeZone: 'UTC',
    },
    connectorId: 'email-1',
    recipients: ['team@example.com'],
    enabled: true,
  };

  it('requires read privileges for listing and manage privileges for mutations', () => {
    expect(scheduledReportsRouteRepository[REPORT_EMAIL_CONNECTORS_ENDPOINT].security).toEqual({
      authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] },
    });
    expect(scheduledReportsRouteRepository[SCHEDULED_REPORTS_LIST_ENDPOINT].security).toEqual({
      authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
    });
    for (const endpoint of [
      SCHEDULED_REPORTS_CREATE_ENDPOINT,
      SCHEDULED_REPORT_UPDATE_ENDPOINT,
      SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
      SCHEDULED_REPORT_RUN_ENDPOINT,
      SCHEDULED_REPORT_DELETE_ENDPOINT,
    ] as const) {
      expect(scheduledReportsRouteRepository[endpoint].security).toEqual({
        authz: {
          requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manage, APM_API_PRIVILEGE],
        },
      });
    }
  });

  it('validates schedule frequency fields, time zone, and recipient emails', () => {
    const schema = scheduledReportsRouteRepository[SCHEDULED_REPORTS_CREATE_ENDPOINT].params;

    expect(schema.safeParse({ path: { serviceName: 'shop' }, body: validBody }).success).toBe(true);

    expect(
      schema.safeParse({
        path: { serviceName: 'shop' },
        body: {
          ...validBody,
          schedule: { frequency: 'WEEKLY', hour: 9, minute: 0, timeZone: 'UTC' },
        },
      }).success
    ).toBe(false);

    expect(
      schema.safeParse({
        path: { serviceName: 'shop' },
        body: {
          ...validBody,
          schedule: { frequency: 'MONTHLY', monthday: 31, hour: 9, minute: 0, timeZone: 'UTC' },
        },
      }).success
    ).toBe(false);

    expect(
      schema.safeParse({
        path: { serviceName: 'shop' },
        body: {
          ...validBody,
          schedule: { ...validBody.schedule, timeZone: 'Not/A_Real_Zone' },
        },
      }).success
    ).toBe(false);

    expect(
      schema.safeParse({
        path: { serviceName: 'shop' },
        body: { ...validBody, recipients: ['not-an-email'] },
      }).success
    ).toBe(false);

    expect(
      schema.safeParse({
        path: { serviceName: 'shop' },
        body: { ...validBody, reportType: 'unknown' },
      }).success
    ).toBe(false);
  });

  it('returns 404 when the Digital Experience feature flag is off', async () => {
    const handler = scheduledReportsRouteRepository[SCHEDULED_REPORTS_LIST_ENDPOINT]
      .handler as unknown as (resources: unknown) => Promise<unknown>;

    await expect(
      handler({
        params: { path: { serviceName: 'shop' } },
        context: {
          core: Promise.resolve({
            featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(false) },
          }),
        },
        request: { spaceId: 'default' },
        logger: loggingSystemMock.create().get(),
        getScheduledReportsServices: jest.fn(),
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });
});
