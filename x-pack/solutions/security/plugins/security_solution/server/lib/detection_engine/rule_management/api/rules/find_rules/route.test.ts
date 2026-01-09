/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  DETECTION_ENGINE_RULES_URL_FIND,
  MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE,
  MAX_RULES_WITH_GAPS_TO_FETCH,
} from '../../../../../../../common/constants';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { requestContextMock, requestMock, serverMock } from '../../../../routes/__mocks__';
import {
  getRuleMock,
  getFindRequest,
  getFindResultWithSingleHit,
  getEmptySavedObjectsResponse,
} from '../../../../routes/__mocks__/request_responses';
import { findRulesRoute } from './route';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';
import { getGapFilteredRuleIds } from '../../../logic/search/get_gap_filtered_rule_ids';

jest.mock('../../../logic/search/get_gap_filtered_rule_ids');
const mockGetGapFilteredRuleIds = getGapFilteredRuleIds as jest.MockedFunction<
  typeof getGapFilteredRuleIds
>;

describe('Find rules route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;

  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
    clients.rulesClient.get.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse());

    findRulesRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catches error if search throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getFindRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows optional query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 2,
          per_page: 20,
          sort_field: 'name',
          fields: ['field1', 'field2'],
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('ignores unknown query params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          invalid_value: 'hi mom',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });
  });

  describe('gap range functionality', () => {
    const gapStartDate = '2025-01-01T00:00:00.000Z';
    const gapEndDate = '2025-01-02T00:00:00.000Z';

    test('calls getGapFilteredRuleIds with correct parameters', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({
        ruleIds: ['rule-1', 'rule-2'],
        truncated: false,
      });

      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
          gaps_range_start: gapStartDate,
          gaps_range_end: gapEndDate,
          gap_fill_statuses: ['unfilled'],
          filter: 'alert.attributes.name: test',
        },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(mockGetGapFilteredRuleIds).toHaveBeenCalledWith({
        rulesClient: expect.anything(),
        gapRange: {
          start: gapStartDate,
          end: gapEndDate,
        },
        gapFillStatuses: ['unfilled'],
        maxRuleIds: MAX_RULES_WITH_GAPS_TO_FETCH,
        filter: 'alert.attributes.name: test',
        sortField: 'enabled',
        sortOrder: 'desc',
      });
    });

    test('returns empty response when no rules have gaps', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({
        ruleIds: [],
        truncated: false,
      });

      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 1,
          per_page: 20,
          gaps_range_start: gapStartDate,
          gaps_range_end: gapEndDate,
          gap_fill_statuses: ['unfilled'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toEqual(0);
    });

    test('returns warnings when truncated is true', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({
        ruleIds: ['rule-1', 'rule-2'],
        truncated: true,
      });

      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 1,
          per_page: 20,
          gaps_range_start: gapStartDate,
          gaps_range_end: gapEndDate,
          gap_fill_statuses: ['unfilled'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.warnings).toEqual([
        {
          type: MAX_RULES_WITH_GAPS_LIMIT_REACHED_WARNING_TYPE,
          message: expect.stringContaining('rules with gaps'),
          actionPath: '',
        },
      ]);
    });

    test('does not return warnings when truncated is false', async () => {
      mockGetGapFilteredRuleIds.mockResolvedValue({
        ruleIds: ['rule-1', 'rule-2'],
        truncated: false,
      });

      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 1,
          per_page: 20,
          gaps_range_start: gapStartDate,
          gaps_range_end: gapEndDate,
          gap_fill_statuses: ['unfilled'],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body.warnings).toBeUndefined();
    });

    test('does not call getGapFilteredRuleIds when gap_fill_statuses is empty', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_URL_FIND,
        query: {
          page: 1,
          per_page: 20,
          gaps_range_start: gapStartDate,
          gaps_range_end: gapEndDate,
          gap_fill_statuses: [],
        },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(mockGetGapFilteredRuleIds).not.toHaveBeenCalled();
    });
  });
});
