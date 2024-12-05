/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import type {
  DefendInsightCreateProps,
  DefendInsightsUpdateProps,
  DefendInsightsGetRequestQuery,
  DefendInsightsResponse,
} from '@kbn/elastic-assistant-common';

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DefendInsightStatus, DefendInsightType } from '@kbn/elastic-assistant-common';

import type { AIAssistantDataClientParams } from '..';

import { getDefendInsightsSearchEsMock } from '../../__mocks__/defend_insights_schema.mock';
import { getDefendInsight } from './get_defend_insight';
import {
  queryParamsToEsQuery,
  transformESSearchToDefendInsights,
  transformToUpdateScheme,
} from './helpers';
import { DefendInsightsDataClient } from '.';

jest.mock('./get_defend_insight');
jest.mock('./helpers', () => {
  const original = jest.requireActual('./helpers');
  return {
    ...original,
    queryParamsToEsQuery: jest.fn(),
  };
});

describe('DefendInsightsDataClient', () => {
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const mockLogger = loggerMock.create();
  const mockGetDefendInsight = jest.mocked(getDefendInsight);
  let user: AuthenticatedUser;
  let dataClientParams: AIAssistantDataClientParams;
  let dataClient: DefendInsightsDataClient;

  function getDefaultUser(): AuthenticatedUser {
    return {
      username: 'test_user',
      profile_uid: '1234',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;
  }

  function getDefaultDataClientParams(): AIAssistantDataClientParams {
    return {
      logger: mockLogger,
      currentUser: user,
      elasticsearchClientPromise: new Promise((resolve) => resolve(mockEsClient)),
      indexPatternsResourceName: 'defend-insights-index',
      kibanaVersion: '9.0.0',
      spaceId: 'space-1',
    } as AIAssistantDataClientParams;
  }

  beforeEach(() => {
    user = getDefaultUser();
    dataClientParams = getDefaultDataClientParams();
    dataClient = new DefendInsightsDataClient(dataClientParams);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefendInsight', () => {
    it('should correctly get defend insight', async () => {
      const id = 'some-id';
      mockGetDefendInsight.mockResolvedValueOnce({ id } as DefendInsightsResponse);
      const response = await dataClient.getDefendInsight({ id, authenticatedUser: user });

      expect(mockGetDefendInsight).toHaveBeenCalledTimes(1);
      expect(response).not.toBeNull();
      expect(response!.id).toEqual(id);
    });
  });

  describe('createDefendInsight', () => {
    const defendInsightCreate: DefendInsightCreateProps = {
      endpointIds: [],
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      insights: [],
      apiConfig: {
        actionTypeId: 'action-type-id',
        connectorId: 'connector-id',
        defaultSystemPromptId: 'default-prompt-id',
        model: 'model-name',
        provider: 'OpenAI',
      },
      eventsContextCount: 10,
      replacements: { key1: 'value1', key2: 'value2' },
      status: DefendInsightStatus.Enum.running,
    };

    it('should create defend insight successfully', async () => {
      const id = 'created-id';
      // @ts-expect-error not full response interface
      mockEsClient.create.mockResolvedValueOnce({ _id: id });
      mockGetDefendInsight.mockResolvedValueOnce({ id } as DefendInsightsResponse);

      const response = await dataClient.createDefendInsight({
        defendInsightCreate,
        authenticatedUser: user,
      });
      expect(mockEsClient.create).toHaveBeenCalledTimes(1);
      expect(mockGetDefendInsight).toHaveBeenCalledTimes(1);
      expect(response).not.toBeNull();
      expect(response!.id).toEqual(id);
    });

    it('should throw error on elasticsearch create failure', async () => {
      mockEsClient.create.mockRejectedValueOnce(new Error('Elasticsearch error'));
      const responsePromise = dataClient.createDefendInsight({
        defendInsightCreate,
        authenticatedUser: user,
      });
      await expect(responsePromise).rejects.toThrowError('Elasticsearch error');
      expect(mockEsClient.create).toHaveBeenCalledTimes(1);
      expect(mockGetDefendInsight).not.toHaveBeenCalled();
    });
  });

  describe('findDefendInsightsByParams', () => {
    let mockQueryParamsToEsQuery: Function;
    let queryParams: DefendInsightsGetRequestQuery;
    let expectedTermFilters: object[];

    function getDefaultQueryParams() {
      return {
        ids: ['insight-id1', 'insight-id2'],
        endpoint_ids: ['endpoint-id1', 'endpoint-id2'],
        connector_id: 'connector-id1',
        type: DefendInsightType.Enum.incompatible_antivirus,
        status: DefendInsightStatus.Enum.succeeded,
      };
    }

    function getDefaultExpectedTermFilters() {
      return [
        { terms: { _id: queryParams.ids } },
        { terms: { endpoint_ids: queryParams.endpoint_ids } },
        { term: { 'api_config.connector_id': queryParams.connector_id } },
        { term: { insight_type: queryParams.type } },
        { term: { status: queryParams.status } },
      ];
    }

    beforeEach(() => {
      queryParams = getDefaultQueryParams();
      expectedTermFilters = getDefaultExpectedTermFilters();
      mockQueryParamsToEsQuery = jest
        .mocked(queryParamsToEsQuery)
        .mockReturnValueOnce(expectedTermFilters);
    });

    it('should return defend insights successfully', async () => {
      const mockResponse = getDefendInsightsSearchEsMock();
      mockEsClient.search.mockResolvedValueOnce(mockResponse);

      const result = await dataClient.findDefendInsightsByParams({
        params: queryParams,
        authenticatedUser: user,
      });
      const expectedResult = transformESSearchToDefendInsights(mockResponse);

      expect(mockQueryParamsToEsQuery).toHaveBeenCalledTimes(1);
      expect(mockQueryParamsToEsQuery).toHaveBeenCalledWith(queryParams);
      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${dataClientParams.indexPatternsResourceName}-${dataClientParams.spaceId}`,
          size: 10,
          sort: [
            {
              '@timestamp': 'desc',
            },
          ],
          query: {
            bool: {
              must: [
                ...expectedTermFilters,
                {
                  nested: {
                    path: 'users',
                    query: {
                      bool: {
                        must: [
                          {
                            match: { 'users.id': user.profile_uid },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it('should log and throw an error if search fails', async () => {
      const mockError = new Error('Search failed');
      mockEsClient.search.mockRejectedValue(mockError);

      await expect(
        dataClient.findDefendInsightsByParams({
          params: queryParams,
          authenticatedUser: user,
        })
      ).rejects.toThrow(mockError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `error fetching Defend insights: ${mockError} with params: ${JSON.stringify(queryParams)}`
      );
    });
  });

  describe('findAllDefendInsights', () => {
    it('should correctly query ES', async () => {
      const mockResponse = getDefendInsightsSearchEsMock();
      mockEsClient.search.mockResolvedValueOnce(mockResponse);
      const searchParams = {
        query: {
          bool: {
            must: [
              {
                nested: {
                  path: 'users',
                  query: {
                    bool: {
                      must: [
                        {
                          match: { 'users.id': user.profile_uid },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
        size: 10000,
        _source: true,
        ignore_unavailable: true,
        index: `${dataClientParams.indexPatternsResourceName}-${dataClientParams.spaceId}`,
        seq_no_primary_term: true,
      };

      const response = await dataClient.findAllDefendInsights({
        authenticatedUser: user,
      });
      expect(response).not.toBeNull();
      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      expect(mockEsClient.search).toHaveBeenCalledWith(searchParams);
    });

    it('should throw error on elasticsearch search failure', async () => {
      mockEsClient.search.mockRejectedValueOnce(new Error('Elasticsearch error'));
      await expect(
        dataClient.findAllDefendInsights({
          authenticatedUser: user,
        })
      ).rejects.toThrowError('Elasticsearch error');
      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateDefendInsights', () => {
    let defendInsightsUpdateProps: DefendInsightsUpdateProps;

    function getDefaultProps() {
      return [
        {
          id: 'insight-id1',
          backingIndex: 'defend-insights-index',
          status: DefendInsightStatus.Enum.succeeded,
          insights: [
            {
              group: 'windows_defender',
              events: [
                {
                  id: 'event-id-1',
                  endpointId: 'endpoint-id-1',
                  value: '/windows/defender/scan.exe',
                },
              ],
            },
          ],
        },
      ];
    }

    beforeEach(async () => {
      defendInsightsUpdateProps = getDefaultProps();
    });

    it('should update defend insights successfully', async () => {
      // ensure startTime is before updatedAt timestamp
      const startTime = new Date().getTime() - 1;
      const mockResponse: DefendInsightsResponse[] = [
        { id: defendInsightsUpdateProps[0].id } as DefendInsightsResponse,
      ];

      const findDefendInsightsByParamsSpy = jest.spyOn(dataClient, 'findDefendInsightsByParams');
      findDefendInsightsByParamsSpy.mockResolvedValueOnce(mockResponse);

      const result = await dataClient.updateDefendInsights({
        defendInsightsUpdateProps,
        authenticatedUser: user,
      });
      const expectedDoc = transformToUpdateScheme('', defendInsightsUpdateProps[0]);
      delete expectedDoc.updated_at;

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        body: [
          {
            update: {
              _index: defendInsightsUpdateProps[0].backingIndex,
              _id: defendInsightsUpdateProps[0].id,
            },
          },
          {
            doc: expect.objectContaining({ ...expectedDoc }),
          },
        ],
        refresh: 'wait_for',
      });
      const updatedAt = (mockEsClient.bulk.mock.calls[0][0] as { body: any[] }).body[1].doc
        .updated_at;
      expect(new Date(updatedAt).getTime()).toBeGreaterThan(startTime);
      expect(dataClient.findDefendInsightsByParams).toHaveBeenCalledTimes(1);
      expect(dataClient.findDefendInsightsByParams).toHaveBeenCalledWith({
        params: { ids: [defendInsightsUpdateProps[0].id] },
        authenticatedUser: user,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should log a warning and throw an error if update fails', async () => {
      const mockError = new Error('Update failed');
      mockEsClient.bulk.mockRejectedValue(mockError);

      await expect(
        dataClient.updateDefendInsights({
          defendInsightsUpdateProps,
          authenticatedUser: user,
        })
      ).rejects.toThrow(mockError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `error updating Defend insights: ${mockError} for IDs: ${defendInsightsUpdateProps[0].id}`
      );
    });
  });

  describe('updateDefendInsight', () => {
    it('correctly calls updateDefendInsights', async () => {
      const defendInsightUpdateProps = {
        id: 'insight-id1',
        backingIndex: 'defend-insights-index',
        status: DefendInsightStatus.Enum.succeeded,
        insights: [
          {
            group: 'windows_defender',
            events: [
              {
                id: 'event-id-1',
                endpointId: 'endpoint-id-1',
                value: '/windows/defender/scan.exe',
              },
            ],
          },
        ],
      };
      const updateDefendInsightsSpy = jest.spyOn(dataClient, 'updateDefendInsights');
      updateDefendInsightsSpy.mockResolvedValueOnce([]);
      await dataClient.updateDefendInsight({
        defendInsightUpdateProps,
        authenticatedUser: user,
      });

      expect(updateDefendInsightsSpy).toHaveBeenCalledTimes(1);
      expect(updateDefendInsightsSpy).toHaveBeenCalledWith({
        defendInsightsUpdateProps: [defendInsightUpdateProps],
        authenticatedUser: user,
      });
    });
  });
});
