/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

import { getCorrelationRuleParams } from '../../rule_schema/mocks';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import { correlationExecutor } from './correlation';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
} from '../../../../../common/field_maps/field_names';
import type { EsqlTable } from '../esql/esql_request';
import type { CorrelationState } from './types';

jest.mock('./compile_correlation_query', () => ({
  compileCorrelationQuery: jest.fn().mockReturnValue('FROM .alerts-security.alerts-default'),
}));

jest.mock('../esql/esql_request', () => ({
  performEsqlRequest: jest.fn(),
}));

jest.mock('../esql/build_esql_search_request', () => ({
  buildEsqlSearchRequest: jest.fn().mockReturnValue({
    query: 'FROM .alerts-security.alerts-default',
    filter: {},
  }),
}));

jest.mock('../factories', () => ({
  bulkCreate: jest.fn().mockResolvedValue({
    success: true,
    bulkCreateDuration: '100',
    createdItemsCount: 0,
    createdItems: [],
    errors: [],
    alertsWereTruncated: false,
    enrichmentDuration: '0',
  }),
}));

const { performEsqlRequest } = jest.requireMock('../esql/esql_request') as {
  performEsqlRequest: jest.Mock;
};

const { bulkCreate: bulkCreateMock } = jest.requireMock('../factories') as {
  bulkCreate: jest.Mock;
};

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const uuidMock = uuidv4 as jest.Mock;

const makeEsqlResponse = (
  rows: Array<Record<string, unknown>>,
  columns?: Array<{ name: string; type: string }>
): EsqlTable => {
  const cols =
    columns ?? Object.keys(rows[0] ?? {}).map((name) => ({ name, type: 'keyword' as const }));
  const values = rows.map((row) => cols.map((col) => row[col.name] as string | null));
  return { columns: cols as EsqlTable['columns'], values };
};

describe('correlationExecutor', () => {
  let ruleServices: PersistenceExecutorOptionsMock;
  let licensing: ReturnType<typeof licensingMock.createSetup>;
  const mockScheduleNotificationResponseActionsService = jest.fn();
  const params = getCorrelationRuleParams();
  const sharedParams = getSharedParamsMock({ ruleParams: params });

  let mockedArguments: Parameters<typeof correlationExecutor>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    licensing = licensingMock.createSetup();
    ruleServices = createPersistenceExecutorOptionsMock();

    let uuidCounter = 0;
    uuidMock.mockImplementation(() => `test-uuid-${uuidCounter++}`);

    mockedArguments = {
      sharedParams,
      services: ruleServices,
      licensing,
      scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      state: {} as CorrelationState,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('successful execution', () => {
    it('should create shell and building-block alerts for a single correlation group', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['alert-1', 'alert-2'],
            rule_names: ['Rule A', 'Rule B'],
            max_risk: 75,
            severity_list: ['high', 'medium'],
            'host.name': 'host-1',
          },
        ])
      );

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(true);
      expect(bulkCreateMock).toHaveBeenCalledTimes(1);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      // 1 shell + 2 building blocks = 3 total alerts
      expect(wrappedAlerts).toHaveLength(3);

      const shellAlert = wrappedAlerts[0]._source;
      expect(shellAlert[ALERT_GROUP_ID]).toBe('test-uuid-0');
      expect(shellAlert[ALERT_UUID]).toBe('test-uuid-0');
      expect(shellAlert['kibana.alert.rule.type']).toBe('correlation');
      expect(shellAlert['kibana.alert.correlated_alerts']).toEqual(['alert-1', 'alert-2']);
      expect(shellAlert[ALERT_BUILDING_BLOCK_TYPE]).toBeUndefined();

      const bb1 = wrappedAlerts[1]._source;
      expect(bb1[ALERT_BUILDING_BLOCK_TYPE]).toBe('default');
      expect(bb1[ALERT_GROUP_ID]).toBe('test-uuid-0');
      expect(bb1[ALERT_GROUP_INDEX]).toBe(0);
      expect(bb1['kibana.alert.original_alert.uuid']).toBe('alert-1');

      const bb2 = wrappedAlerts[2]._source;
      expect(bb2[ALERT_BUILDING_BLOCK_TYPE]).toBe('default');
      expect(bb2[ALERT_GROUP_ID]).toBe('test-uuid-0');
      expect(bb2[ALERT_GROUP_INDEX]).toBe(1);
      expect(bb2['kibana.alert.original_alert.uuid']).toBe('alert-2');
    });

    it('should compute composite risk score with temporal boost', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1', 'a2', 'a3'],
            rule_names: ['R1', 'R2', 'R3'],
            max_risk: 60,
            severity_list: ['medium'],
            'host.name': 'host-1',
          },
        ])
      );

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(true);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      // temporal type: boostMultiplier = min(3, 5) * 0.1 = 0.3
      // compositeRiskScore = min(round(60 * 1.3), 100) = 78
      expect(shellAlert['kibana.alert.risk_score']).toBe(78);
    });

    it('should cap composite risk score at 100', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1', 'a2', 'a3', 'a4', 'a5'],
            rule_names: ['R1', 'R2', 'R3', 'R4', 'R5'],
            max_risk: 95,
            severity_list: ['critical'],
            'host.name': 'host-1',
          },
        ])
      );

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(true);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      // boostMultiplier = min(5, 5) * 0.1 = 0.5
      // compositeRiskScore = min(round(95 * 1.5), 100) = 100 (capped)
      expect(shellAlert['kibana.alert.risk_score']).toBe(100);
    });

    it('should schedule notification response actions', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1'],
            rule_names: ['R1'],
            max_risk: 50,
            severity_list: ['medium'],
            'host.name': 'host-1',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      expect(mockScheduleNotificationResponseActionsService).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty results', () => {
    it('should return early with no alerts when no correlation groups are found', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse(
          [],
          [
            { name: 'alert_ids', type: 'keyword' },
            { name: 'rule_names', type: 'keyword' },
            { name: 'max_risk', type: 'keyword' },
            { name: 'severity_list', type: 'keyword' },
            { name: 'host.name', type: 'keyword' },
          ]
        )
      );

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(true);
      expect(bulkCreateMock).not.toHaveBeenCalled();
      expect(result.totalEventsFound).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should capture error and return success=false when ES|QL request fails', async () => {
      performEsqlRequest.mockRejectedValueOnce(new Error('ES|QL query failed'));

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('ES|QL query failed');
      expect(bulkCreateMock).not.toHaveBeenCalled();
    });

    it('should capture error message from non-standard errors', async () => {
      performEsqlRequest.mockRejectedValueOnce('string error without Error object');

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('string error without Error object');
    });
  });

  describe('multiple correlation groups', () => {
    it('should create correct number of shell + building-block alerts for 3 groups', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1', 'a2'],
            rule_names: ['R1', 'R2'],
            max_risk: 50,
            severity_list: ['medium', 'low'],
            'host.name': 'host-1',
          },
          {
            alert_ids: ['a3', 'a4', 'a5'],
            rule_names: ['R3', 'R4', 'R5'],
            max_risk: 80,
            severity_list: ['high', 'high', 'medium'],
            'host.name': 'host-2',
          },
          {
            alert_ids: ['a6'],
            rule_names: ['R6'],
            max_risk: 30,
            severity_list: ['low'],
            'host.name': 'host-3',
          },
        ])
      );

      const result = await correlationExecutor(mockedArguments);

      expect(result.success).toBe(true);
      expect(result.totalEventsFound).toBe(3);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      // Group 1: 1 shell + 2 bb = 3
      // Group 2: 1 shell + 3 bb = 4
      // Group 3: 1 shell + 1 bb = 2
      // Total = 9
      expect(wrappedAlerts).toHaveLength(9);

      const shellAlerts = wrappedAlerts.filter(
        (a: { _source: Record<string, unknown> }) =>
          a._source[ALERT_BUILDING_BLOCK_TYPE] === undefined
      );
      const buildingBlocks = wrappedAlerts.filter(
        (a: { _source: Record<string, unknown> }) =>
          a._source[ALERT_BUILDING_BLOCK_TYPE] === 'default'
      );

      expect(shellAlerts).toHaveLength(3);
      expect(buildingBlocks).toHaveLength(6);
    });

    it('should assign unique group IDs per correlation group', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1'],
            rule_names: ['R1'],
            max_risk: 50,
            severity_list: ['medium'],
            'host.name': 'host-1',
          },
          {
            alert_ids: ['a2'],
            rule_names: ['R2'],
            max_risk: 60,
            severity_list: ['high'],
            'host.name': 'host-2',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;

      // First group: shell uuid = test-uuid-0, bb uuid = test-uuid-1
      // Second group: shell uuid = test-uuid-2, bb uuid = test-uuid-3
      const group1Shell = wrappedAlerts[0]._source;
      const group1Bb = wrappedAlerts[1]._source;
      const group2Shell = wrappedAlerts[2]._source;
      const group2Bb = wrappedAlerts[3]._source;

      expect(group1Shell[ALERT_GROUP_ID]).toBe('test-uuid-0');
      expect(group1Bb[ALERT_GROUP_ID]).toBe('test-uuid-0');
      expect(group2Shell[ALERT_GROUP_ID]).toBe('test-uuid-2');
      expect(group2Bb[ALERT_GROUP_ID]).toBe('test-uuid-2');

      expect(group1Shell[ALERT_GROUP_ID]).not.toBe(group2Shell[ALERT_GROUP_ID]);
    });
  });

  describe('severity propagation', () => {
    it('should select the highest severity from mixed severity list', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1', 'a2', 'a3'],
            rule_names: ['R1', 'R2', 'R3'],
            max_risk: 70,
            severity_list: ['low', 'high', 'medium'],
            'host.name': 'host-1',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      expect(shellAlert['kibana.alert.severity']).toBe('high');
    });

    it('should select critical when present in severity list', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1', 'a2'],
            rule_names: ['R1', 'R2'],
            max_risk: 90,
            severity_list: ['medium', 'critical'],
            'host.name': 'host-1',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      expect(shellAlert['kibana.alert.severity']).toBe('critical');
    });

    it('should default to low when severity list is empty', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1'],
            rule_names: ['R1'],
            max_risk: 20,
            severity_list: [],
            'host.name': 'host-1',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      expect(shellAlert['kibana.alert.severity']).toBe('low');
    });

    it('should propagate the same severity to building blocks', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1', 'a2'],
            rule_names: ['R1', 'R2'],
            max_risk: 70,
            severity_list: ['high', 'low'],
            'host.name': 'host-1',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      const bb1 = wrappedAlerts[1]._source;
      const bb2 = wrappedAlerts[2]._source;

      expect(shellAlert['kibana.alert.severity']).toBe('high');
      expect(bb1['kibana.alert.severity']).toBe('high');
      expect(bb2['kibana.alert.severity']).toBe('high');
    });
  });

  describe('group-by field propagation', () => {
    it('should include group-by field values in shell and building-block alerts', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse([
          {
            alert_ids: ['a1'],
            rule_names: ['R1'],
            max_risk: 50,
            severity_list: ['medium'],
            'host.name': 'host-abc',
          },
        ])
      );

      await correlationExecutor(mockedArguments);

      const wrappedAlerts = bulkCreateMock.mock.calls[0][0].wrappedAlerts;
      const shellAlert = wrappedAlerts[0]._source;
      const bb = wrappedAlerts[1]._source;

      expect(shellAlert['host.name']).toBe('host-abc');
      expect(bb['host.name']).toBe('host-abc');
    });
  });

  describe('state passthrough', () => {
    it('should return state from input', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse(
          [],
          [
            { name: 'alert_ids', type: 'keyword' },
            { name: 'max_risk', type: 'keyword' },
          ]
        )
      );

      const inputState: CorrelationState = { isLoggedRequestsEnabled: true };
      mockedArguments.state = inputState;

      const result = await correlationExecutor(mockedArguments);

      expect(result.state).toEqual(expect.objectContaining({ isLoggedRequestsEnabled: true }));
    });

    it('should include loggedRequests when isLoggedRequestsEnabled is true', async () => {
      performEsqlRequest.mockResolvedValueOnce(
        makeEsqlResponse(
          [],
          [
            { name: 'alert_ids', type: 'keyword' },
            { name: 'max_risk', type: 'keyword' },
          ]
        )
      );

      mockedArguments.state = { isLoggedRequestsEnabled: true };

      const result = await correlationExecutor(mockedArguments);

      expect(result).toHaveProperty('loggedRequests');
    });
  });
});
