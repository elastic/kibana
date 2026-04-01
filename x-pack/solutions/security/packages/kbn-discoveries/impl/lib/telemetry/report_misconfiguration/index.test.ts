/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { ATTACK_DISCOVERY_MISCONFIGURATION_EVENT } from '../event_based_telemetry';
import { reportMisconfiguration } from '.';

const mockAnalytics = coreMock.createSetup().analytics;
const mockLogger = loggingSystemMock.createLogger();

describe('reportMisconfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports a misconfiguration event with all fields', () => {
    reportMisconfiguration({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        detail: 'Alerts index does not exist',
        misconfiguration_type: 'alerts_index_missing',
        space_id: 'default',
        workflow_id: 'workflow-123',
      },
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_MISCONFIGURATION_EVENT.eventType,
      {
        detail: 'Alerts index does not exist',
        misconfiguration_type: 'alerts_index_missing',
        space_id: 'default',
        workflow_id: 'workflow-123',
      }
    );
  });

  it('reports a misconfiguration event with only required fields', () => {
    reportMisconfiguration({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        misconfiguration_type: 'connector_unreachable',
      },
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_MISCONFIGURATION_EVENT.eventType,
      {
        misconfiguration_type: 'connector_unreachable',
      }
    );
  });

  it('reports default_workflows_resolution_failed type', () => {
    reportMisconfiguration({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        detail: 'Default workflows could not be resolved',
        misconfiguration_type: 'default_workflows_resolution_failed',
        space_id: 'custom-space',
      },
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_MISCONFIGURATION_EVENT.eventType,
      {
        detail: 'Default workflows could not be resolved',
        misconfiguration_type: 'default_workflows_resolution_failed',
        space_id: 'custom-space',
      }
    );
  });

  it('logs debug message when reportEvent throws', () => {
    mockAnalytics.reportEvent.mockImplementationOnce(() => {
      throw new Error('analytics failure');
    });

    reportMisconfiguration({
      analytics: mockAnalytics,
      logger: mockLogger,
      params: {
        misconfiguration_type: 'workflow_not_found',
      },
    });

    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
