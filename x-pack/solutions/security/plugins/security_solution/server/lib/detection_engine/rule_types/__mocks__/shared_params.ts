/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import type { QueryRuleParams, RuleParams } from '../../rule_schema';
import type { SecuritySharedParams } from '../types';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { createRuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';
import { getCompleteRuleMock } from '../../rule_schema/mocks';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

export const getSharedParamsMock = <T extends RuleParams = QueryRuleParams>({
  ruleParams,
  rewrites,
}: {
  ruleParams: T;
  rewrites?: Partial<SecuritySharedParams<T>>;
}): SecuritySharedParams<T> => ({
  ruleExecutionLogger: ruleExecutionLogMock.forExecutors.create(),
  completeRule: getCompleteRuleMock(ruleParams),
  mergeStrategy: 'allFields',
  spaceId: 'default',
  inputIndex: DEFAULT_INDEX_PATTERN,
  alertTimestampOverride: undefined,
  publicBaseUrl: 'http://testkibanabaseurl.com',
  experimentalFeatures: allowedExperimentalValues,
  intendedTimestamp: undefined,
  primaryTimestamp: '@timestamp',
  listClient: getListClientMock(),
  tuple: {
    from: dateMath.parse(ruleParams.from) as moment.Moment,
    to: dateMath.parse(ruleParams.to) as moment.Moment,
    maxSignals: ruleParams.maxSignals,
  },
  searchAfterSize: 100,
  ruleDataClient: createRuleDataClientMock(),
  runtimeMappings: undefined,
  aggregatableTimestampField: '@timestamp',
  unprocessedExceptions: [],
  exceptionFilter: undefined,
  refreshOnIndexingAlerts: false,
  ignoreFields: {},
  ignoreFieldsRegexes: [],
  eventsTelemetry: createMockTelemetryEventsSender(true),
  licensing: licensingMock.createSetup(),
  scheduleNotificationResponseActionsService: () => null,
  ...rewrites,
});
