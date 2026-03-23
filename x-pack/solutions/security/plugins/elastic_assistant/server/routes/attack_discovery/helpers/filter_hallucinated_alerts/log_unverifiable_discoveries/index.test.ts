/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

import { logUnverifiableDiscoveries } from '.';

describe('logUnverifiableDiscoveries', () => {
  const mockLogger = loggerMock.create();

  // Helper to extract the actual message from a lazy-evaluated logger call
  const getInfoMessage = () => {
    const call = mockLogger.info.mock.calls[0][0];
    return typeof call === 'function' ? call() : call;
  };

  const getDebugMessage = (callIndex: number = 0) => {
    const call = mockLogger.debug.mock.calls[callIndex][0];
    return typeof call === 'function' ? call() : call;
  };

  const mockDiscovery1: AttackDiscovery = {
    alertIds: ['alert-1', 'alert-2', 'alert-3'],
    detailsMarkdown: 'Details 1',
    summaryMarkdown: 'Summary 1',
    timestamp: '2024-01-01T00:00:00.000Z',
    title: 'Discovery 1',
  };

  const mockDiscovery2: AttackDiscovery = {
    alertIds: ['alert-4', 'alert-5'],
    detailsMarkdown: 'Details 2',
    summaryMarkdown: 'Summary 2',
    timestamp: '2024-01-02T00:00:00.000Z',
    title: 'Discovery 2',
  };

  const discoveryWithNoAlerts1: AttackDiscovery = {
    alertIds: [],
    detailsMarkdown: 'Details',
    summaryMarkdown: 'Summary',
    timestamp: '2024-01-01T00:00:00.000Z',
    title: 'Discovery with no alerts',
  };

  const discoveryWithNoAlerts2: AttackDiscovery = {
    alertIds: [],
    detailsMarkdown: 'Details 2',
    summaryMarkdown: 'Summary 2',
    timestamp: '2024-01-02T00:00:00.000Z',
    title: 'Another discovery with no alerts',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no discoveries are unverifiable', () => {
    const allDiscoveries = [mockDiscovery1, mockDiscovery2];
    const verifiableDiscoveries = [mockDiscovery1, mockDiscovery2];

    it('does not log an info messages', () => {
      logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('does not log a debug messages', () => {
      logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('when discoveries are unverifiable', () => {
    describe('with a single unverifiable discovery', () => {
      const allDiscoveries = [discoveryWithNoAlerts1, mockDiscovery1];
      const verifiableDiscoveries = [mockDiscovery1];

      it('logs the expected info message with count', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 1 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs the expected debug message', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage()).toContain('Discovery with no alerts');
      });
    });

    describe('with multiple unverifiable discoveries', () => {
      const allDiscoveries = [discoveryWithNoAlerts1, mockDiscovery1, discoveryWithNoAlerts2];
      const verifiableDiscoveries = [mockDiscovery1];

      it('logs the expected info message with count of unverifiable discoveries', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 2 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs debug messages for each unverifiable discovery', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      });
    });

    describe('debug logging content', () => {
      const allDiscoveries = [discoveryWithNoAlerts1, mockDiscovery1];
      const verifiableDiscoveries = [mockDiscovery1];

      it('logs the expected debug message that includes the discovery title', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage()).toContain('Discovery with no alerts');
      });

      it('mentions empty alertIds in debug message', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage()).toContain('empty alertIds');
      });

      it('includes the "Filtered discovery" prefix', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage()).toContain('Filtered discovery');
      });
    });

    describe('with all discoveries unverifiable', () => {
      const allDiscoveries = [discoveryWithNoAlerts1, discoveryWithNoAlerts2];
      const verifiableDiscoveries: AttackDiscovery[] = [];

      it('logs the expected info message with total count', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 2 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs the expected debug message for the first discovery', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage(0)).toContain('Discovery with no alerts');
      });

      it('logs the expected debug message for the second discovery', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage(1)).toContain('Another discovery with no alerts');
      });
    });

    describe('with custom discovery title', () => {
      const discoveryWithTitle: AttackDiscovery = {
        alertIds: [],
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Custom Discovery Title',
      };
      const allDiscoveries = [discoveryWithTitle, mockDiscovery1];
      const verifiableDiscoveries = [mockDiscovery1];

      it('logs the expected debug message that includes the custom title', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage()).toContain('Custom Discovery Title');
      });
    });
  });

  describe('edge cases', () => {
    describe('with empty arrays', () => {
      const allDiscoveries: AttackDiscovery[] = [];
      const verifiableDiscoveries: AttackDiscovery[] = [];

      it('does not log an info messages', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it('does not log a debug messages', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(mockLogger.debug).not.toHaveBeenCalled();
      });
    });

    describe('when only unverifiable discoveries exist', () => {
      const allDiscoveries = [discoveryWithNoAlerts1, discoveryWithNoAlerts2];
      const verifiableDiscoveries: AttackDiscovery[] = [];

      it('logs the expected info message', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 2 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs a debug message for each unverifiable discovery', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      });
    });

    describe('with mixed verifiable and unverifiable discoveries', () => {
      const allDiscoveries = [mockDiscovery1, discoveryWithNoAlerts1, mockDiscovery2];
      const verifiableDiscoveries = [mockDiscovery1, mockDiscovery2];

      it('logs the expected info message with a correct count', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 1 hallucinated discovery(ies) with empty alertIds'
        );
      });

      it('logs the expected debug message content for the unverifiable discovery', () => {
        logUnverifiableDiscoveries(mockLogger, allDiscoveries, verifiableDiscoveries);

        expect(getDebugMessage()).toContain('Discovery with no alerts');
      });
    });
  });
});
