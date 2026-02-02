/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor, screen } from '@testing-library/react';
import { useHistory } from 'react-router-dom';
// Jest's global object does not have the crypto library.
// Therefore we import Node's.
// eslint-disable-next-line import/no-nodejs-modules
import { webcrypto } from 'crypto';
import { AIValueExportProvider, useAIValueExportContext } from './export_provider';
import { useKibana } from '../../../common/lib/kibana';
import { AIValueReportEventTypes } from '../../../common/lib/telemetry/events/ai_value_report/types';
import type { AIValueReportParams } from '../../../../common/locators/ai_value_report/locator';

jest.mock('react-router', () => {
  return {
    useHistory: jest.fn(),
  };
});

jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});
const useHistoryMock = useHistory as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const reportEventMock = jest.fn();

type ContextValue = ReturnType<typeof useAIValueExportContext>;

const reportInput = {
  attackAlertIds: ['0f6ca8ce-4ed5-4d71-88a6-fba3f87003f3'],
  valueMetrics: {
    attackDiscoveryCount: 14,
    filteredAlerts: 4952,
    filteredAlertsPerc: 99.73816717019133,
    escalatedAlertsPerc: 0.2618328298086606,
    hoursSaved: 662,
    totalAlerts: 4965,
    costSavings: 49650,
  },
  valueMetricsCompare: {
    attackDiscoveryCount: 0,
    filteredAlerts: 5035,
    filteredAlertsPerc: 100,
    escalatedAlertsPerc: 0,
    hoursSaved: 671.3333333333334,
    totalAlerts: 5035,
    costSavings: 50350,
  },
  analystHourlyRate: 75,
  minutesPerAlert: 8,
};

const reportDataHash = '856cbc3cfa41e8458e99f1b017bde73738a10d0cbbe3dea13a4960297957c645';

const timeRange = {
  kind: 'absolute',
  to: '2025-11-18T13:18:59.691Z',
  from: '2025-10-18T12:18:59.691Z',
} satisfies AIValueReportParams['timeRange'];

const TestComponent = ({ contextValueFn }: { contextValueFn: (context: ContextValue) => void }) => {
  const context = useAIValueExportContext();
  contextValueFn(context);
  return (
    <>
      <span>{context?.isInsightVerified ? 'Insight verified' : ''}</span>
      <span>{context?.shouldRegenerateInsight ? 'Insight should regenerate' : ''}</span>
      <span>
        {context?.buildForwardedState({ timeRange }) ? 'buildForwardedState available' : ''}
      </span>
    </>
  );
};

describe('AIValueExportContext', () => {
  let context: ContextValue = null;
  const doRender = async (locationState: unknown) => {
    useHistoryMock.mockReturnValue({
      location: {
        state: locationState,
      },
    });
    render(
      <AIValueExportProvider>
        <TestComponent
          contextValueFn={(contextValue) => {
            context = contextValue;
          }}
        />
      </AIValueExportProvider>
    );
  };

  const verifyInsight = () => waitFor(() => screen.getByText('Insight verified'));
  const verifyInsightShouldRegenerate = () =>
    waitFor(() => screen.getByText('Insight should regenerate'));
  const verifyBuildForwardedStateFnAvailable = () =>
    waitFor(() => screen.getByText('buildForwardedState available'));

  const setReportInput = (input: typeof reportInput) => act(() => context?.setReportInput(input));
  const setInsight = (insight: string) => act(() => context?.setInsight(insight));

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperties(global, {
      crypto: { value: webcrypto, writable: true },
    });

    useKibanaMock.mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    });
  });

  const forwardedState = {
    timeRange,
    insight: 'Some valuable insight',
    reportDataHash,
  };

  describe('export mode: the page is being rendered in the backend for export', () => {
    describe('when there is a forwarded state is valid', () => {
      beforeEach(async () => {
        doRender(forwardedState);
        setReportInput(reportInput);
        await verifyInsight();
      });
      it('should parse the forwarded state correctly', () => {
        expect(context?.forwardedState).toEqual(forwardedState);
      });

      it('should verify the insight', () => {
        expect(context?.isInsightVerified).toBe(true);
      });

      it('should indicate that the insight should NOT be regenerated', () => {
        expect(context?.shouldRegenerateInsight).toBe(false);
      });

      it('should report a telemetry event indicating that the report is being exported', () => {
        expect(reportEventMock).toHaveBeenCalledWith(
          AIValueReportEventTypes.AIValueReportExportExecution,
          {}
        );
      });

      it('should report a telemetry event indicating that the insight should not be regenerated', () => {
        expect(reportEventMock).toHaveBeenCalledWith(
          AIValueReportEventTypes.AIValueReportExportInsightVerified,
          {
            shouldRegenerate: false,
          }
        );
      });
    });

    describe('when there is a forwarded state is valid and the report input is different', () => {
      beforeEach(async () => {
        doRender(forwardedState);
        setReportInput({ ...reportInput, minutesPerAlert: 12345 });
        await verifyInsight();
      });

      it('should verify the insight', () => {
        expect(context?.isInsightVerified).toBe(true);
      });

      it('should indicate that the insight should be regenerated', () => {
        expect(context?.shouldRegenerateInsight).toBe(true);
      });

      it('should report a telemetry event indicating that the insight should be regenerated', () => {
        expect(reportEventMock).toHaveBeenCalledWith(
          AIValueReportEventTypes.AIValueReportExportInsightVerified,
          {
            shouldRegenerate: true,
          }
        );
      });
    });

    describe('when the forwarded state is invalid', () => {
      beforeEach(() => {
        doRender('something unexpected');
      });
      it('should set the forwarded state to undefined', () => {
        expect(context?.forwardedState).toBe(undefined);
      });
    });

    describe('when hashing returns an error', () => {
      const errorMessage = 'Boom while hashing!';
      beforeEach(async () => {
        Object.defineProperties(global, {
          crypto: {
            value: {
              subtle: {
                digest: () => {
                  throw Error(errorMessage);
                },
              },
            },
            writable: true,
          },
        });
        doRender(forwardedState);
        setReportInput(reportInput);
        await verifyInsight();
      });

      it('should report a telemetry event with the error', () => {
        expect(reportEventMock).toHaveBeenCalledWith(
          AIValueReportEventTypes.AIValueReportExportError,
          {
            errorMessage,
            isExportMode: true,
          }
        );
      });

      it('should indicate that the insight should be regenerated', async () => {
        await verifyInsightShouldRegenerate();
      });
    });
  });

  describe("normal mode: the page is rendered in the user's browser", () => {
    describe('happy path', () => {
      beforeEach(() => {
        doRender(undefined);
      });

      it('should expose a buildForwardedState that is defined only when the insight and the report input has loaded', async () => {
        const buildState = () => context?.buildForwardedState({ timeRange });
        expect(buildState()).toBeUndefined();
        setInsight('Some valuable insight');
        expect(buildState()).toBeUndefined();
        setReportInput(reportInput);
        await verifyBuildForwardedStateFnAvailable();

        expect(buildState()).toEqual({
          timeRange,
          insight: 'Some valuable insight',
          reportDataHash,
        });
      });
    });

    describe('when hashing returns an error', () => {
      const errorMessage = 'Boom while hashing!';
      beforeEach(async () => {
        Object.defineProperties(global, {
          crypto: {
            value: {
              subtle: {
                digest: () => {
                  throw Error(errorMessage);
                },
              },
            },
            writable: true,
          },
        });
        doRender(undefined);
        setReportInput(reportInput);
      });

      it('should report a telemetry event with the error', async () => {
        waitFor(() => {
          expect(reportEventMock).toHaveBeenCalledWith(
            AIValueReportEventTypes.AIValueReportExportError,
            {
              errorMessage,
              isExportMode: false,
            }
          );
        });
      });
    });
  });
});
