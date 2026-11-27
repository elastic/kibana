/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import {
  MAX_CONNECTOR_ID_LENGTH,
  MAX_RECIPIENT_LENGTH,
  MAX_REPORT_LOOKBACK_DAYS,
  MAX_REPORT_RECIPIENTS,
  MAX_SCHEDULED_REPORT_NAME_LENGTH,
  MAX_SCHEDULE_ID_LENGTH,
  MAX_TIME_ZONE_LENGTH,
  MIN_REPORT_LOOKBACK_DAYS,
  REPORT_EMAIL_CONNECTORS_ENDPOINT,
  REPORT_FREQUENCIES,
  REPORT_TYPES,
  REPORT_WEEKDAYS,
  SCHEDULED_REPORTS_CREATE_ENDPOINT,
  SCHEDULED_REPORTS_LIST_ENDPOINT,
  SCHEDULED_REPORT_DELETE_ENDPOINT,
  SCHEDULED_REPORT_RUN_ENDPOINT,
  SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
  SCHEDULED_REPORT_UPDATE_ENDPOINT,
  type DeleteScheduledReportResponse,
  type EmailConnectorsResponse,
  type RunScheduledReportResponse,
  type ScheduledReport,
  type ScheduledReportsListResponse,
  type SetScheduledReportEnabledResponse,
} from '../../../common/types/scheduled_reports';
import { MAX_ENVIRONMENT_LENGTH, MAX_SERVICE_NAME_LENGTH } from '../../lib/constants';
import {
  createScheduledReport,
  deleteScheduledReport,
  listEmailConnectors,
  listScheduledReports,
  runScheduledReport,
  setScheduledReportEnabled,
  updateScheduledReport,
} from '../../lib/report/scheduled_reports_service';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';

export {
  REPORT_EMAIL_CONNECTORS_ENDPOINT,
  SCHEDULED_REPORTS_CREATE_ENDPOINT,
  SCHEDULED_REPORTS_LIST_ENDPOINT,
  SCHEDULED_REPORT_DELETE_ENDPOINT,
  SCHEDULED_REPORT_RUN_ENDPOINT,
  SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
  SCHEDULED_REPORT_UPDATE_ENDPOINT,
};

const OPTIONS = { access: 'internal' } as const;

const READ_SECURITY = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, APM_API_PRIVILEGE] },
};

const MANAGE_SECURITY = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manage, APM_API_PRIVILEGE] },
};

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
};

const servicePathParams = () =>
  z.object({
    serviceName: z.string().min(1).max(MAX_SERVICE_NAME_LENGTH),
  });

const schedulePathParams = () =>
  z.object({
    serviceName: z.string().min(1).max(MAX_SERVICE_NAME_LENGTH),
    scheduleId: z.string().min(1).max(MAX_SCHEDULE_ID_LENGTH),
  });

const scheduledReportBody = () =>
  z.object({
    reportType: z.enum(REPORT_TYPES),
    name: z.string().trim().min(1).max(MAX_SCHEDULED_REPORT_NAME_LENGTH),
    environment: z.string().trim().min(1).max(MAX_ENVIRONMENT_LENGTH).optional(),
    lookbackDays: z.number().int().min(MIN_REPORT_LOOKBACK_DAYS).max(MAX_REPORT_LOOKBACK_DAYS),
    schedule: z
      .object({
        frequency: z.enum(REPORT_FREQUENCIES),
        weekday: z.enum(REPORT_WEEKDAYS).optional(),
        monthday: z.number().int().min(1).max(28).optional(),
        hour: z.number().int().min(0).max(23),
        minute: z.number().int().min(0).max(59),
        timeZone: z
          .string()
          .trim()
          .min(1)
          .max(MAX_TIME_ZONE_LENGTH)
          .refine(isValidTimeZone, { message: 'Invalid time zone' }),
      })
      .superRefine((schedule, ctx) => {
        if (schedule.frequency === 'WEEKLY' && !schedule.weekday) {
          ctx.addIssue({
            code: 'custom',
            path: ['weekday'],
            message: 'Weekday is required for weekly schedules',
          });
        }
        if (schedule.frequency === 'MONTHLY' && schedule.monthday === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['monthday'],
            message: 'Day of month is required for monthly schedules',
          });
        }
      }),
    connectorId: z.string().trim().min(1).max(MAX_CONNECTOR_ID_LENGTH),
    recipients: z
      .array(z.string().trim().email().max(MAX_RECIPIENT_LENGTH))
      .min(1)
      .max(MAX_REPORT_RECIPIENTS),
    enabled: z.boolean(),
  });

/** Routes for listing email connectors and managing scheduled scorecard reports. */
export const scheduledReportsRouteRepository = {
  ...createDigitalExperienceServerRoute({
    endpoint: REPORT_EMAIL_CONNECTORS_ENDPOINT,
    options: OPTIONS,
    security: {
      authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] },
    },
    handler: async ({ request, getScheduledReportsServices }): Promise<EmailConnectorsResponse> =>
      listEmailConnectors({
        services: await getScheduledReportsServices(),
        request,
      }),
  }),

  ...createDigitalExperienceServerRoute({
    endpoint: SCHEDULED_REPORTS_LIST_ENDPOINT,
    options: OPTIONS,
    security: READ_SECURITY,
    params: lazySchema(() => z.object({ path: servicePathParams() })),
    handler: async ({
      params,
      request,
      logger,
      getScheduledReportsServices,
    }): Promise<ScheduledReportsListResponse> =>
      listScheduledReports({
        services: await getScheduledReportsServices(),
        request,
        serviceName: params.path.serviceName,
        logger,
      }),
  }),

  ...createDigitalExperienceServerRoute({
    endpoint: SCHEDULED_REPORTS_CREATE_ENDPOINT,
    options: OPTIONS,
    security: MANAGE_SECURITY,
    params: lazySchema(() =>
      z.object({
        path: servicePathParams(),
        body: scheduledReportBody(),
      })
    ),
    handler: async ({ params, request, getScheduledReportsServices }): Promise<ScheduledReport> =>
      createScheduledReport({
        services: await getScheduledReportsServices(),
        request,
        serviceName: params.path.serviceName,
        input: params.body,
      }),
  }),

  ...createDigitalExperienceServerRoute({
    endpoint: SCHEDULED_REPORT_UPDATE_ENDPOINT,
    options: OPTIONS,
    security: MANAGE_SECURITY,
    params: lazySchema(() =>
      z.object({
        path: schedulePathParams(),
        body: scheduledReportBody(),
      })
    ),
    handler: async ({ params, request, getScheduledReportsServices }): Promise<ScheduledReport> =>
      updateScheduledReport({
        services: await getScheduledReportsServices(),
        request,
        serviceName: params.path.serviceName,
        scheduleId: params.path.scheduleId,
        input: params.body,
      }),
  }),

  ...createDigitalExperienceServerRoute({
    endpoint: SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
    options: OPTIONS,
    security: MANAGE_SECURITY,
    params: lazySchema(() =>
      z.object({
        path: schedulePathParams(),
        body: z.object({ enabled: z.boolean() }),
      })
    ),
    handler: async ({
      params,
      request,
      getScheduledReportsServices,
    }): Promise<SetScheduledReportEnabledResponse> =>
      setScheduledReportEnabled({
        services: await getScheduledReportsServices(),
        request,
        serviceName: params.path.serviceName,
        scheduleId: params.path.scheduleId,
        enabled: params.body.enabled,
      }),
  }),

  ...createDigitalExperienceServerRoute({
    endpoint: SCHEDULED_REPORT_RUN_ENDPOINT,
    options: OPTIONS,
    security: MANAGE_SECURITY,
    params: lazySchema(() => z.object({ path: schedulePathParams() })),
    handler: async ({
      params,
      request,
      getScheduledReportsServices,
    }): Promise<RunScheduledReportResponse> =>
      runScheduledReport({
        services: await getScheduledReportsServices(),
        request,
        serviceName: params.path.serviceName,
        scheduleId: params.path.scheduleId,
      }),
  }),

  ...createDigitalExperienceServerRoute({
    endpoint: SCHEDULED_REPORT_DELETE_ENDPOINT,
    options: OPTIONS,
    security: MANAGE_SECURITY,
    params: lazySchema(() => z.object({ path: schedulePathParams() })),
    handler: async ({
      params,
      request,
      getScheduledReportsServices,
    }): Promise<DeleteScheduledReportResponse> =>
      deleteScheduledReport({
        services: await getScheduledReportsServices(),
        request,
        serviceName: params.path.serviceName,
        scheduleId: params.path.scheduleId,
      }),
  }),
};
