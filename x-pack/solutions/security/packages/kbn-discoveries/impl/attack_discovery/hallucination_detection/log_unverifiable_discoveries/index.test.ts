/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { logUnverifiableDiscoveries } from '.';
import type { DiscoveryWithAlertIds } from '../types';

describe('logUnverifiableDiscoveries', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDiscovery1: DiscoveryWithAlertIds = {
    alertIds: ['alert-1', 'alert-2'],
    title: 'Discovery 1',
  };

  const mockDiscovery2: DiscoveryWithAlertIds = {
    alertIds: [],
    title: 'Discovery 2 (empty)',
  };

  const mockDiscovery3: DiscoveryWithAlertIds = {
    alertIds: [],
    title: 'Discovery 3 (empty)',
  };

  describe('when all discoveries are verifiable', () => {
    it('does not log anything', () => {
      logUnverifiableDiscoveries(mockLogger, [mockDiscovery1], [mockDiscovery1]);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('when some discoveries are unverifiable', () => {
    it('logs info message with count', () => {
      logUnverifiableDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        [mockDiscovery1]
      );

      const infoCall = mockLogger.info.mock.calls[0][0];
      const message = typeof infoCall === 'function' ? infoCall() : infoCall;
      expect(message).toBe(
        'Attack discovery: Filtered out 2 hallucinated discovery(ies) with empty alertIds'
      );
    });

    it('logs debug message for each unverifiable discovery', () => {
      logUnverifiableDiscoveries(
        mockLogger,
        [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        [mockDiscovery1]
      );

      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });

    it('includes discovery title in debug message', () => {
      logUnverifiableDiscoveries(mockLogger, [mockDiscovery1, mockDiscovery2], [mockDiscovery1]);

      const debugCall = mockLogger.debug.mock.calls[0][0];
      const message = typeof debugCall === 'function' ? debugCall() : debugCall;
      expect(message).toContain('Discovery 2 (empty)');
    });
  });
});
