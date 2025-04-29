/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleExecutionEventsResponseMock,
  getRuleExecutionResultsResponseMock,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/mocks';

import type { IRuleExecutionLogForRoutes } from '../client_for_routes/client_interface';
import type {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
} from '../client_for_executors/client_interface';

type GetExecutionEvents = IRuleExecutionLogForRoutes['getExecutionEvents'];
type GetExecutionResults = IRuleExecutionLogForRoutes['getExecutionResults'];

const ruleExecutionLogForRoutesMock = {
  create: (): jest.Mocked<IRuleExecutionLogForRoutes> => ({
    getExecutionEvents: jest
      .fn<ReturnType<GetExecutionEvents>, Parameters<GetExecutionEvents>>()
      .mockResolvedValue(getRuleExecutionEventsResponseMock.getSomeResponse()),

    getExecutionResults: jest
      .fn<ReturnType<GetExecutionResults>, Parameters<GetExecutionResults>>()
      .mockResolvedValue(getRuleExecutionResultsResponseMock.getSomeResponse()),
  }),
};

const ruleExecutionLogForExecutorsMock = {
  create: (
    context: Partial<RuleExecutionContext> = {}
  ): jest.Mocked<IRuleExecutionLogForExecutors> => ({
    context: {
      executionId: context.executionId ?? 'some execution id',
      ruleId: context.ruleId ?? 'some rule id',
      ruleUuid: context.ruleUuid ?? 'some rule uuid',
      ruleName: context.ruleName ?? 'Some rule',
      ruleRevision: context.ruleRevision ?? 0,
      ruleType: context.ruleType ?? 'some rule type',
      spaceId: context.spaceId ?? 'some space id',
    },

    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),

    logStatusChange: jest.fn(),
  }),
};

export const ruleExecutionLogMock = {
  forRoutes: ruleExecutionLogForRoutesMock,
  forExecutors: ruleExecutionLogForExecutorsMock,
};
