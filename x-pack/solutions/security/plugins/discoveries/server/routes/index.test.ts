/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { AnalyticsServiceSetup, IRouter } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { registerRoutes } from '.';
import * as deleteScheduleModule from './delete/schedules/delete_schedule';
import * as generateModule from './generate/post_generate';
import * as getDefaultEsqlQueryModule from './get/default_esql_query/get_default_esql_query';
import * as getExecutionTrackingModule from './get/execution_tracking/get_execution_tracking';
import * as findSchedulesModule from './get/schedules/find_schedules';
import * as getScheduleModule from './get/schedules/get_schedule';
import * as getPipelineDataModule from './get/pipeline_data/get_pipeline_data';
import * as createScheduleModule from './post/schedules/create_schedule';
import * as disableScheduleModule from './post/schedules/disable_schedule';
import * as enableScheduleModule from './post/schedules/enable_schedule';
import * as updateScheduleModule from './put/schedules/update_schedule';

vi.mock('./delete/schedules/delete_schedule');
vi.mock('./generate/post_generate');
vi.mock('./get/default_esql_query/get_default_esql_query');
vi.mock('./get/execution_tracking/get_execution_tracking');
vi.mock('./get/schedules/find_schedules');
vi.mock('./get/schedules/get_schedule');
vi.mock('./get/pipeline_data/get_pipeline_data');
vi.mock('./post/schedules/create_schedule');
vi.mock('./post/schedules/disable_schedule');
vi.mock('./post/schedules/enable_schedule');
vi.mock('./put/schedules/update_schedule');

describe('registerRoutes', () => {
  const mockRouter = {} as IRouter;
  const mockLogger = loggerMock.create();
  const mockAnalytics = {} as AnalyticsServiceSetup;
  const mockGetEventLogIndex = vi.fn();
  const mockGetEventLogger = vi.fn();
  const mockGetStartServices = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers generate route', () => {
    const registerGenerateRouteSpy = vi.spyOn(generateModule, 'registerGenerateRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(registerGenerateRouteSpy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowsManagementApi: undefined,
    });
  });

  it('registers get pipeline data route', () => {
    const registerGetPipelineDataRouteSpy = vi.spyOn(
      getPipelineDataModule,
      'registerGetPipelineDataRoute'
    );

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(registerGetPipelineDataRouteSpy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getEventLogIndex: mockGetEventLogIndex,
      getStartServices: mockGetStartServices,
      workflowsManagementApi: undefined,
    });
  });

  it('registers get default esql query route', () => {
    const spy = vi.spyOn(getDefaultEsqlQueryModule, 'registerGetDefaultEsqlQueryRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
    });
  });

  it('registers get execution tracking route', () => {
    const spy = vi.spyOn(getExecutionTrackingModule, 'registerGetExecutionTrackingRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getEventLogIndex: mockGetEventLogIndex,
      getStartServices: mockGetStartServices,
    });
  });

  it('registers create schedule route', () => {
    const spy = vi.spyOn(createScheduleModule, 'registerCreateScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers delete schedule route', () => {
    const spy = vi.spyOn(deleteScheduleModule, 'registerDeleteScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers disable schedule route', () => {
    const spy = vi.spyOn(disableScheduleModule, 'registerDisableScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers enable schedule route', () => {
    const spy = vi.spyOn(enableScheduleModule, 'registerEnableScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers find schedules route', () => {
    const spy = vi.spyOn(findSchedulesModule, 'registerFindSchedulesRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers get schedule route', () => {
    const spy = vi.spyOn(getScheduleModule, 'registerGetScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers update schedule route', () => {
    const spy = vi.spyOn(updateScheduleModule, 'registerUpdateScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });
});
