/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefendInsightsGetRequestQuery } from '@kbn/elastic-assistant-common';

import { DefendInsightType, DefendInsightStatus } from '@kbn/elastic-assistant-common';

import { queryParamsToEsQuery } from './helpers';

describe('defend insights data client helpers', () => {
  describe('queryParamsToEsQuery', () => {
    let queryParams: DefendInsightsGetRequestQuery;
    let expectedQuery: object[];

    function getDefaultQueryParams(): DefendInsightsGetRequestQuery {
      return {
        ids: ['insight-id1', 'insight-id2'],
        endpoint_ids: ['endpoint-id1', 'endpoint-id2'],
        connector_id: 'connector-id1',
        type: DefendInsightType.Enum.incompatible_antivirus,
        status: DefendInsightStatus.Enum.succeeded,
      };
    }

    function getDefaultExpectedQuery(): object[] {
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
      expectedQuery = getDefaultExpectedQuery();
    });

    it('should correctly convert valid query parameters to Elasticsearch query format', () => {
      const result = queryParamsToEsQuery(queryParams);
      expect(result).toEqual(expectedQuery);
    });

    it('should ignore invalid query parameters', () => {
      const badParams = {
        ...queryParams,
        invalid_param: 'invalid value',
      };

      const result = queryParamsToEsQuery(badParams);
      expect(result).toEqual(expectedQuery);
    });

    it('should handle empty query parameters', () => {
      const result = queryParamsToEsQuery({});
      expect(result).toEqual([]);
    });
  });
});
