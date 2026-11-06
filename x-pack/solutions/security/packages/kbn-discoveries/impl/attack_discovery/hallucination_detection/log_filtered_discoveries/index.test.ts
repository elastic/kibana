/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { logFilteredDiscoveries } from '.';
import type { DiscoveryWithAlertIds } from '../types';

describe('logFilteredDiscoveries', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDiscovery1: DiscoveryWithAlertIds = {
    alertIds: ['alert-1', 'alert-2'],
    title: 'Discovery 1',
  };

  const mockDiscovery2: DiscoveryWithAlertIds = {
    alertIds: ['alert-3'],
    title: 'Discovery 2',
  };

  const mockDiscovery3: DiscoveryWithAlertIds = {
    alertIds: ['alert-4', 'alert-5'],
    title: 'Discovery 3',
  };

  describe('when no discoveries are filtered', () => {
    beforeEach(() => {
      const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3']);

      logFilteredDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2],
        [mockDiscovery1, mockDiscovery2],
        existingAlertIds
      );
    });

    it('does not log info messages', () => {
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('does not log debug messages', () => {
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('when some discoveries are filtered', () => {
    const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3']);

    it('logs info message with count', () => {
      logFilteredDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        [mockDiscovery1, mockDiscovery2],
        existingAlertIds
      );

      const infoCall = mockLogger.info.mock.calls[0][0];
      const message = typeof infoCall === 'function' ? infoCall() : infoCall;
      expect(message).toBe(
        'Attack discovery: Filtered out 1 discovery(ies) with hallucinated alert IDs'
      );
    });

    it('logs debug message for each filtered discovery', () => {
      logFilteredDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        [mockDiscovery1, mockDiscovery2],
        existingAlertIds
      );

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('includes discovery title in debug message', () => {
      logFilteredDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        [mockDiscovery1, mockDiscovery2],
        existingAlertIds
      );

      const debugCall = mockLogger.debug.mock.calls[0][0];
      const message = typeof debugCall === 'function' ? debugCall() : debugCall;
      expect(message).toContain('Discovery 3');
    });

    describe('debug message content', () => {
      let message: string;

      beforeEach(() => {
        logFilteredDiscoveries(
          mockLogger,
          [mockDiscovery1, mockDiscovery2, mockDiscovery3],
          [mockDiscovery1, mockDiscovery2],
          existingAlertIds
        );

        const debugCall = mockLogger.debug.mock.calls[0][0];
        message = typeof debugCall === 'function' ? debugCall() : debugCall;
      });

      it('includes first hallucinated alert ID', () => {
        expect(message).toContain('alert-4');
      });

      it('includes second hallucinated alert ID', () => {
        expect(message).toContain('alert-5');
      });
    });

    it('includes count of hallucinated IDs in debug message', () => {
      logFilteredDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        [mockDiscovery1, mockDiscovery2],
        existingAlertIds
      );

      const debugCall = mockLogger.debug.mock.calls[0][0];
      const message = typeof debugCall === 'function' ? debugCall() : debugCall;
      expect(message).toContain('2 hallucinated alert ID(s)');
    });
  });
});
