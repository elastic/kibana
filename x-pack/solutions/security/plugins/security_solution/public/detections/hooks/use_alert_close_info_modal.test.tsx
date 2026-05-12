/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasAlertsInSuppressionWindow } from './use_alert_close_info_modal';
import { fetchQueryAlerts } from '../containers/detection_engine/alerts/api';

jest.mock('../containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: jest.fn(),
}));

describe('hasAlertsInSuppressionWindow', () => {
  const fetchQueryAlertsMock = fetchQueryAlerts as jest.Mock;

  const mockSuccessfulResponse = (matchingAlerts: number) => {
    fetchQueryAlertsMock.mockResolvedValueOnce({
      hits: {
        total: {
          value: matchingAlerts,
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  interface BuildDescribeBodyParams {
    matchingAlerts: number;
    expectedResult: boolean;
  }

  let params: Parameters<typeof hasAlertsInSuppressionWindow>[0];
  describe('when a list of ids is passed', () => {
    beforeEach(() => {
      params = {
        ids: ['id1', 'id2'],
        query: JSON.stringify({ bool: { filter: [{ some: { filter: 'foo' } }] } }),
      };
    });

    const buildDescribeBody = ({ matchingAlerts, expectedResult }: BuildDescribeBodyParams) => {
      let result: boolean | undefined;
      beforeEach(async () => {
        mockSuccessfulResponse(matchingAlerts);
        result = await hasAlertsInSuppressionWindow(params);
      });

      it('should only use the list of ids and attempt to search through the alerts with the right query', () => {
        expect(fetchQueryAlertsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              query: {
                bool: {
                  filter: expect.arrayContaining([
                    { ids: { values: ['id1', 'id2'] } },
                    {
                      exists: {
                        field: 'kibana.alert.rule.parameters.alert_suppression.duration.value',
                      },
                    },
                  ]),
                },
              },
              size: 0,
            },
            signal: expect.any(AbortSignal),
          })
        );
      });

      it(`should return ${expectedResult}`, () => {
        expect(result).toBe(expectedResult);
      });
    };

    describe('when there are alerts with a suppression window defined', () => {
      buildDescribeBody({ matchingAlerts: 2, expectedResult: true });
    });

    describe('when there are not alerts with a suppression window defined', () => {
      buildDescribeBody({ matchingAlerts: 0, expectedResult: false });
    });
  });

  describe('when a query is passed', () => {
    beforeEach(() => {
      params = {
        query: JSON.stringify({
          bool: {
            filter: [{ some: { filter: 'foo' } }],
          },
        }),
      };
    });

    const buildDescribeBody = ({ matchingAlerts, expectedResult }: BuildDescribeBodyParams) => {
      let result: boolean | undefined;
      beforeEach(async () => {
        mockSuccessfulResponse(matchingAlerts);
        result = await hasAlertsInSuppressionWindow(params);
      });

      it('should attempt to search through the alerts with the right query', () => {
        expect(fetchQueryAlertsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              query: {
                bool: {
                  filter: expect.arrayContaining([
                    // It should preserve the existing filter
                    { some: { filter: 'foo' } },
                    {
                      exists: {
                        field: 'kibana.alert.rule.parameters.alert_suppression.duration.value',
                      },
                    },
                  ]),
                },
              },
              size: 0,
            },
            signal: expect.any(AbortSignal),
          })
        );
      });

      it(`should return ${expectedResult}`, () => {
        expect(result).toBe(expectedResult);
      });
    };

    describe('when there are alerts with a suppression window defined', () => {
      buildDescribeBody({ matchingAlerts: 2, expectedResult: true });
    });

    describe('when there are not alerts with a suppression window defined', () => {
      buildDescribeBody({ matchingAlerts: 0, expectedResult: false });
    });
  });

  it('should throw an error if neither query nor ids are provided', async () => {
    await expect(hasAlertsInSuppressionWindow({})).rejects.toThrow(
      'either query or a non empty list of alert ids must be defined'
    );
  });
});
