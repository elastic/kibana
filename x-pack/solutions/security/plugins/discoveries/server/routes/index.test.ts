/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, IRouter } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { registerRoutes } from '.';
import * as deleteScheduleModule from './delete/schedules/delete_schedule';
import * as generateModule from './generate/post_generate';
import * as getDefaultEsqlQueryModule from './get/default_esql_query/get_default_esql_query';
import * as getExecutionTrackingModule from './get/execution_tracking/get_execution_tracking';
import * as findSchedulesModule from './get/schedules/find_schedules';
import * as getScheduleModule from './get/schedules/get_schedule';
import * as getPipelineDataModule from './get/pipeline_data/get_pipeline_data';
import type { WorkflowInitializationService } from '../lib/workflow_initialization';
import * as generateWorkflowModule from './post/generate_workflow/post_generate_workflow';
import * as createScheduleModule from './post/schedules/create_schedule';
import * as disableScheduleModule from './post/schedules/disable_schedule';
import * as enableScheduleModule from './post/schedules/enable_schedule';
import * as validateModule from './post/validate/post_validate';
import * as updateScheduleModule from './put/schedules/update_schedule';

jest.mock('./delete/schedules/delete_schedule');
jest.mock('./generate/post_generate');
jest.mock('./get/default_esql_query/get_default_esql_query');
jest.mock('./get/execution_tracking/get_execution_tracking');
jest.mock('./get/schedules/find_schedules');
jest.mock('./get/schedules/get_schedule');
jest.mock('./get/pipeline_data/get_pipeline_data');
jest.mock('./post/generate_workflow/post_generate_workflow');
jest.mock('./post/schedules/create_schedule');
jest.mock('./post/schedules/disable_schedule');
jest.mock('./post/schedules/enable_schedule');
jest.mock('./post/validate/post_validate');
jest.mock('./put/schedules/update_schedule');

describe('registerRoutes', () => {
  const mockRouter = {} as IRouter;
  const mockLogger = loggerMock.create();
  const mockAdhocAttackDiscoveryDataClient = {} as IRuleDataClient;
  const mockAnalytics = {} as AnalyticsServiceSetup;
  const mockGetEventLogIndex = jest.fn();
  const mockGetEventLogger = jest.fn();
  const mockGetStartServices = jest.fn();
  const mockWorkflowInitService = {
    ensureWorkflowsForSpace: jest.fn(),
    verifyAndRepairWorkflows: jest.fn(),
  } as WorkflowInitializationService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers generate route', () => {
    const registerGenerateRouteSpy = jest.spyOn(generateModule, 'registerGenerateRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(registerGenerateRouteSpy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: undefined,
    });
  });

  it('registers get pipeline data route', () => {
    const registerGetPipelineDataRouteSpy = jest.spyOn(
      getPipelineDataModule,
      'registerGetPipelineDataRoute'
    );

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(registerGetPipelineDataRouteSpy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getEventLogIndex: mockGetEventLogIndex,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: undefined,
    });
  });

  it('registers get default esql query route', () => {
    const spy = jest.spyOn(getDefaultEsqlQueryModule, 'registerGetDefaultEsqlQueryRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
    });
  });

  it('registers get execution tracking route', () => {
    const spy = jest.spyOn(getExecutionTrackingModule, 'registerGetExecutionTrackingRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getEventLogIndex: mockGetEventLogIndex,
      getStartServices: mockGetStartServices,
    });
  });

  it('registers generate workflow route', () => {
    const registerGenerateWorkflowRouteSpy = jest.spyOn(
      generateWorkflowModule,
      'registerGenerateWorkflowRoute'
    );

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(registerGenerateWorkflowRouteSpy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
      workflowsManagementApi: undefined,
    });
  });

  it('registers validate route', () => {
    const registerValidateRouteSpy = jest.spyOn(validateModule, 'registerValidateRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(registerValidateRouteSpy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });
  });

  it('registers create schedule route', () => {
    const spy = jest.spyOn(createScheduleModule, 'registerCreateScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers delete schedule route', () => {
    const spy = jest.spyOn(deleteScheduleModule, 'registerDeleteScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers disable schedule route', () => {
    const spy = jest.spyOn(disableScheduleModule, 'registerDisableScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers enable schedule route', () => {
    const spy = jest.spyOn(enableScheduleModule, 'registerEnableScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers find schedules route', () => {
    const spy = jest.spyOn(findSchedulesModule, 'registerFindSchedulesRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers get schedule route', () => {
    const spy = jest.spyOn(getScheduleModule, 'registerGetScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });

  it('registers update schedule route', () => {
    const spy = jest.spyOn(updateScheduleModule, 'registerUpdateScheduleRoute');

    registerRoutes(mockRouter, mockLogger, {
      adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
      analytics: mockAnalytics,
      getEventLogIndex: mockGetEventLogIndex,
      getEventLogger: mockGetEventLogger,
      getStartServices: mockGetStartServices,
      workflowInitService: mockWorkflowInitService,
    });

    expect(spy).toHaveBeenCalledWith(mockRouter, mockLogger, {
      analytics: mockAnalytics,
      getStartServices: mockGetStartServices,
      workflowsApi: undefined,
    });
  });
});
