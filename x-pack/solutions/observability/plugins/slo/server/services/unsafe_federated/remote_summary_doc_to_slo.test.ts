/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { fromRemoteSummaryDocumentToSloDefinition } from './remote_summary_doc_to_slo';

describe('FromRemoteSummaryDocToSlo', () => {
  let loggerMock: jest.Mocked<MockedLogger>;
  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('with kibana < v8.14', () => {
    it('fallbacks to dummy indicator params and dates', () => {
      const slo = fromRemoteSummaryDocumentToSloDefinition(
        {
          service: {
            environment: null,
            name: null,
          },
          transaction: {
            name: null,
            type: null,
          },
          monitor: {
            name: null,
            config_id: null,
          },
          observer: {
            name: null,
            geo: {
              name: null,
            },
          },
          slo: {
            indicator: {
              type: 'sli.kql.custom',
            },
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            groupBy: ALL_VALUE,
            groupings: {},
            instanceId: ALL_VALUE,
            name: 'irrelevant',
            description: 'irrelevant',
            id: 'irrelevant',
            budgetingMethod: 'timeslices',
            revision: 1,
            objective: {
              target: 0.9999,
              timesliceTarget: 0.95,
              timesliceWindow: '5m',
            },
            tags: ['prod'],
          },
          goodEvents: 0,
          totalEvents: 0,
          errorBudgetEstimated: false,
          errorBudgetRemaining: 1,
          errorBudgetConsumed: 0,
          errorBudgetInitial: 1 - 0.9999,
          sliValue: -1,
          statusCode: 0,
          status: 'NO_DATA',
          isTempDoc: true,
          spaceId: 'irrelevant',
          summaryUpdatedAt: null,
          latestSliTimestamp: null,
        },
        loggerMock
      );

      expect(slo).toMatchSnapshot();
    });
  });

  describe('with kibana >= v8.14', () => {
    it('uses the stringified indicator params and dates', () => {
      const slo = fromRemoteSummaryDocumentToSloDefinition(
        {
          service: {
            environment: null,
            name: null,
          },
          transaction: {
            name: null,
            type: null,
          },
          monitor: {
            name: null,
            config_id: null,
          },
          observer: {
            name: null,
            geo: {
              name: null,
            },
          },
          slo: {
            indicator: {
              type: 'sli.kql.custom',
              params: {
                index: 'irrelvant',
                good: 'irrelevant',
                total: 'irrelevant',
                timestampField: 'irrelevant',
              }, // added in 8.14
            },
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            groupBy: ALL_VALUE,
            groupings: {},
            instanceId: ALL_VALUE,
            name: 'irrelevant',
            description: 'irrelevant',
            id: 'irrelevant',
            budgetingMethod: 'occurrences',
            revision: 1,
            objective: {
              target: 0.9999,
            },
            tags: ['prod'],
            createdAt: '2024-02-01T00:00:00.000Z', // added in 8.14
            updatedAt: '2024-02-01T00:00:00.000Z', // added in 8.14
          },
          goodEvents: 0,
          totalEvents: 0,
          errorBudgetEstimated: false,
          errorBudgetRemaining: 1,
          errorBudgetConsumed: 0,
          errorBudgetInitial: 1 - 0.9999,
          sliValue: -1,
          statusCode: 0,
          status: 'NO_DATA',
          isTempDoc: true,
          spaceId: 'irrelevant',
          kibanaUrl: 'http://kibana.com/base-path', // added in 8.14
          summaryUpdatedAt: null,
          latestSliTimestamp: null,
        },
        loggerMock
      );

      expect(slo).toMatchSnapshot();
    });
  });
});
