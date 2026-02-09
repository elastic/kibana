/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

import { logFilteredDiscoveries } from '.';

describe('logFilteredDiscoveries', () => {
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

  const mockDiscovery3: AttackDiscovery = {
    alertIds: ['alert-6', 'alert-7', 'alert-8'],
    detailsMarkdown: 'Details 3',
    summaryMarkdown: 'Summary 3',
    timestamp: '2024-01-03T00:00:00.000Z',
    title: 'Discovery 3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no discoveries are filtered', () => {
    const allDiscoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];
    const validDiscoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];
    const existingAlertIds = new Set([
      'alert-1',
      'alert-2',
      'alert-3',
      'alert-4',
      'alert-5',
      'alert-6',
      'alert-7',
      'alert-8',
    ]);

    it('does not log info messages', () => {
      logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('does not log debug messages', () => {
      logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('when discoveries are filtered', () => {
    describe('with multiple filtered discoveries', () => {
      const allDiscoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];
      const validDiscoveries = [mockDiscovery1];
      const existingAlertIds = new Set([
        'alert-1',
        'alert-2',
        'alert-3',
        // alert-4, alert-5 missing (discovery 2 filtered)
        // alert-6, alert-7, alert-8 missing (discovery 3 filtered)
      ]);

      it('logs info message with count of filtered discoveries', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 2 discovery(ies) with hallucinated alert IDs'
        );
      });
    });

    describe('with a single filtered discovery', () => {
      const allDiscoveries = [mockDiscovery1, mockDiscovery2];
      const validDiscoveries = [mockDiscovery1];
      const existingAlertIds = new Set([
        'alert-1',
        'alert-2',
        'alert-3',
        // alert-4, alert-5 missing (discovery 2 filtered)
      ]);

      it('logs info message with count', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 1 discovery(ies) with hallucinated alert IDs'
        );
      });

      it('logs debug message once', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      });
    });

    describe('debug logging content', () => {
      const allDiscoveries = [mockDiscovery1, mockDiscovery2];
      const validDiscoveries = [mockDiscovery1];
      const existingAlertIds = new Set([
        'alert-1',
        'alert-2',
        'alert-3',
        // alert-4, alert-5 missing (discovery 2 filtered)
      ]);

      it('logs discovery title in debug message', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain('Discovery 2');
      });

      it('logs first hallucinated alert ID', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain('alert-4');
      });

      it('logs second hallucinated alert ID', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain('alert-5');
      });
    });

    describe('with all alert IDs hallucinated', () => {
      const allDiscoveries = [mockDiscovery1, mockDiscovery2];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([
        // All alert IDs missing - both discoveries filtered
      ]);

      it('logs debug messages for each discovery', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      });

      it('logs first discovery hallucinated IDs in JSON format', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage(0)).toContain(JSON.stringify(['alert-1', 'alert-2', 'alert-3']));
      });

      it('logs second discovery hallucinated IDs in JSON format', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage(1)).toContain(JSON.stringify(['alert-4', 'alert-5']));
      });
    });

    describe('with count of hallucinated IDs', () => {
      const allDiscoveries = [mockDiscovery1, mockDiscovery3];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([
        // All alert IDs missing - both discoveries filtered
      ]);

      it('logs count for first discovery', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage(0)).toContain('with 3 hallucinated');
      });

      it('logs count for second discovery', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage(1)).toContain('with 3 hallucinated');
      });
    });

    describe('with partial hallucinated IDs', () => {
      const allDiscoveries = [mockDiscovery1];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set([
        'alert-1',
        'alert-2',
        // alert-3 missing (discovery 1 filtered)
      ]);

      it('logs count of hallucinated IDs', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain('with 1 hallucinated');
      });

      it('logs the hallucinated alert ID', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain(JSON.stringify(['alert-3']));
      });
    });

    describe('with custom discovery title', () => {
      const discoveryWithTitle: AttackDiscovery = {
        alertIds: ['alert-1'],
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Custom Discovery Title',
      };
      const allDiscoveries = [discoveryWithTitle];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([
        // alert-1 missing (discovery filtered)
      ]);

      it('logs the custom title in debug message', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain('Custom Discovery Title');
      });
    });

    describe('lazy evaluation', () => {
      const allDiscoveries = [mockDiscovery1];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([
        // All alert IDs missing (discovery filtered)
      ]);

      it('uses lazy evaluation for debug logging', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(typeof mockLogger.debug.mock.calls[0][0]).toBe('function');
      });
    });
  });

  describe('edge cases', () => {
    describe('with empty arrays', () => {
      const allDiscoveries: AttackDiscovery[] = [];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([]);

      it('does not log info messages', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it('does not log debug messages', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(mockLogger.debug).not.toHaveBeenCalled();
      });
    });

    describe('with discovery containing empty alertIds', () => {
      const discoveryWithNoAlerts: AttackDiscovery = {
        alertIds: [],
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Discovery with no alerts',
      };
      const allDiscoveries = [discoveryWithNoAlerts];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([
        // Discovery has no alert IDs (filtered)
      ]);

      it('logs info message', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(mockLogger.info).toHaveBeenCalled();
      });

      it('logs debug message with zero hallucinated count', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getDebugMessage()).toContain('with 0 hallucinated');
      });
    });

    describe('when all discoveries are filtered', () => {
      const allDiscoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];
      const validDiscoveries: AttackDiscovery[] = [];
      const existingAlertIds = new Set<string>([
        // All alert IDs missing - all discoveries filtered
      ]);

      it('logs info message with total count', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(getInfoMessage()).toBe(
          'Attack discovery: Filtered out 3 discovery(ies) with hallucinated alert IDs'
        );
      });

      it('logs debug message for each discovery', () => {
        logFilteredDiscoveries(mockLogger, allDiscoveries, validDiscoveries, existingAlertIds);

        expect(mockLogger.debug).toHaveBeenCalledTimes(3);
      });
    });
  });
});
