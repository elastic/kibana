/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedQueryService, mockedSearchService } from '../../../mocks/test_providers';
import { BehaviorSubject, throwError } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import {
  Aggregation,
  convertAggregationToChartSeries,
  createFetchAggregatedIndicators,
} from './fetch_aggregated_indicators';
import { BARCHART_AGGREGATION_NAME, FactoryQueryType } from '../../../../common/constants';
import { mockUiSetting } from '../../../mocks/mock_kibana_ui_settings_service';

const aggregationResponse = {
  rawResponse: { aggregations: { [BARCHART_AGGREGATION_NAME]: { buckets: [] } } },
};

const aggregation1: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 0,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 10,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH Malware',
};
const aggregation2: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 20,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 8,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH MalwareBazaar',
};

const mockUserDateFormat = mockUiSetting('dateFormat') as string;
const mockUserTimeZone = mockUiSetting('dateFormat:tz') as string;
const mockField = { label: 'myField', value: 'string' };

describe('FetchAggregatedIndicatorsService', () => {
  beforeEach(jest.clearAllMocks);

  describe('aggregatedIndicatorsQuery()', () => {
    describe('when query is successful', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(new BehaviorSubject(aggregationResponse));
      });

      it('should pass the query down to searchService', async () => {
        const aggregatedIndicatorsQuery = createFetchAggregatedIndicators({
          searchService: mockedSearchService,
          queryService: mockedQueryService as any,
          inspectorAdapter: new RequestAdapter(),
          userTimeZone: mockUserTimeZone,
          userFormat: mockUserDateFormat,
        });

        const result = await aggregatedIndicatorsQuery({
          selectedPatterns: [],
          filterQuery: { language: 'kuery', query: '' },
          filters: [],
          field: mockField,
          timeRange: {
            from: '',
            to: '',
          },
        });

        expect(mockedSearchService.search).toHaveBeenCalled();
        expect(mockedSearchService.search).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              body: expect.objectContaining({
                query: expect.objectContaining({ bool: expect.anything() }),
              }),
              index: [],
            }),
            factoryQueryType: FactoryQueryType.Barchart,
            dateRange: expect.anything(),
            field: 'myField',
          }),
          expect.anything()
        );

        expect(result).toMatchInlineSnapshot(`Array []`);
      });
    });

    describe('when query fails', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(
          throwError(() => new Error('some random exception'))
        );
      });

      it('should throw an error', async () => {
        const aggregatedIndicatorsQuery = createFetchAggregatedIndicators({
          searchService: mockedSearchService,
          queryService: mockedQueryService as any,
          inspectorAdapter: new RequestAdapter(),
          userTimeZone: mockUserTimeZone,
          userFormat: mockUserDateFormat,
        });

        try {
          await aggregatedIndicatorsQuery({
            selectedPatterns: [],
            filterQuery: { language: 'kuery', query: '' },
            filters: [],
            field: mockField,
            timeRange: {
              from: '',
              to: '',
            },
          });
        } catch (error) {
          expect(error).toMatchInlineSnapshot(`[Error: some random exception]`);
        }

        expect.assertions(1);
      });
    });
  });
});

describe('convertAggregationToChartSeries', () => {
  it('should convert Aggregation[] to ChartSeries[]', () => {
    expect(
      convertAggregationToChartSeries(
        [aggregation1, aggregation2],
        mockUserTimeZone,
        mockUserDateFormat,
        mockField
      )
    ).toEqual([
      {
        x: '1 Jan 2022 06:00:00 GMT',
        y: 0,
        g: '[Filebeat] AbuseCH Malware',
      },
      {
        x: '1 Jan 2022 12:00:00 GMT',
        y: 10,
        g: '[Filebeat] AbuseCH Malware',
      },
      {
        x: '1 Jan 2022 06:00:00 GMT',
        y: 20,
        g: '[Filebeat] AbuseCH MalwareBazaar',
      },
      {
        x: '1 Jan 2022 12:00:00 GMT',
        y: 8,
        g: '[Filebeat] AbuseCH MalwareBazaar',
      },
    ]);
  });
});
