/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SecuritySolutionEventBus } from '../../events/event_bus';
import { forwardCasesAlertStatusToSecuritySolution } from './cases_alert_status_bridge';
import { MAX_ALERTS_PER_TRIGGER } from '../../../common/workflows/triggers';

const mockRequest = {} as KibanaRequest;

describe('forwardCasesAlertStatusToSecuritySolution', () => {
  let bus: SecuritySolutionEventBus;
  let mockLogger: Pick<Logger, 'warn'>;

  beforeEach(() => {
    bus = new SecuritySolutionEventBus();
    mockLogger = { warn: jest.fn() };
  });

  afterEach(() => {
    bus.removeAllListeners();
  });

  const securityAliasIndex = '.alerts-security.alerts-default';
  const securityBackingIndex = '.internal.alerts-security.alerts-default-000001';
  const siemSignalsIndex = '.siem-signals-default-000001';
  const obsIndex = '.alerts-observability.logs.alerts-default';

  it('emits alertStatusChanged with the correct payload', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['a1', 'a2'],
      status: 'acknowledged',
      previousStatuses: [
        { id: 'a1', previousStatus: 'open' },
        { id: 'a2', previousStatus: 'open' },
      ],
      alertIdToIndex: { a1: securityAliasIndex, a2: securityAliasIndex },
      indices: [securityAliasIndex],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['a1', 'a2']);
    expect(payload.status).toBe('acknowledged');
    expect(payload.previousStatuses).toEqual([
      { id: 'a1', previousStatus: 'open' },
      { id: 'a2', previousStatus: 'open' },
    ]);
    expect(payload.truncated).toBe(false);
  });

  it('does not emit when no index is a Security index', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['a1'],
      status: 'acknowledged',
      previousStatuses: [{ id: 'a1', previousStatus: 'open' }],
      alertIdToIndex: { a1: obsIndex },
      indices: [obsIndex],
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('emits only security alertIds when case has mixed SS and obs alerts', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['ss1', 'obs1', 'ss2'],
      status: 'closed',
      previousStatuses: [
        { id: 'ss1', previousStatus: 'open' },
        { id: 'obs1', previousStatus: 'open' },
        { id: 'ss2', previousStatus: 'acknowledged' },
      ],
      alertIdToIndex: {
        ss1: securityAliasIndex,
        obs1: obsIndex,
        ss2: securityAliasIndex,
      },
      indices: [securityAliasIndex, obsIndex],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['ss1', 'ss2']);
    expect(payload.previousStatuses).toEqual([
      { id: 'ss1', previousStatus: 'open' },
      { id: 'ss2', previousStatus: 'acknowledged' },
    ]);
  });

  it('does not emit when all alertIds map to non-security indices (even if indices list has security entry)', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    // indices list says security, but alertIdToIndex shows all IDs are in obs index
    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['obs1'],
      status: 'closed',
      previousStatuses: [{ id: 'obs1', previousStatus: 'open' }],
      alertIdToIndex: { obs1: obsIndex },
      indices: [securityAliasIndex],
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('emits when index is a RAC backing index (.internal.alerts-security.*)', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['a1'],
      status: 'closed',
      previousStatuses: [{ id: 'a1', previousStatus: 'open' }],
      alertIdToIndex: { a1: securityBackingIndex },
      indices: [securityBackingIndex],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].payload.alertIds).toEqual(['a1']);
  });

  it('emits when index is a legacy siem-signals index', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['a1'],
      status: 'closed',
      previousStatuses: [{ id: 'a1', previousStatus: 'open' }],
      alertIdToIndex: { a1: siemSignalsIndex },
      indices: [siemSignalsIndex],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].payload.alertIds).toEqual(['a1']);
  });

  it('caps alertIds to MAX_ALERTS_PER_TRIGGER and sets truncated: true', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 5 }, (_, i) => `id-${i}`);
    const alertIdToIndex = Object.fromEntries(oversizedIds.map((id) => [id, securityAliasIndex]));
    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: oversizedIds,
      status: 'closed',
      previousStatuses: [],
      alertIdToIndex,
      indices: [securityAliasIndex],
    });

    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toHaveLength(MAX_ALERTS_PER_TRIGGER);
    expect(payload.truncated).toBe(true);
  });

  it('caps previousStatuses to MAX_ALERTS_PER_TRIGGER', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    const oversizedPrev = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 3 }, (_, i) => ({
      id: `id-${i}`,
      previousStatus: 'open' as const,
    }));
    const oversizedIds = oversizedPrev.map((p) => p.id);
    const alertIdToIndex = Object.fromEntries(oversizedIds.map((id) => [id, securityAliasIndex]));
    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: oversizedIds,
      status: 'open',
      previousStatuses: oversizedPrev,
      alertIdToIndex,
      indices: [securityAliasIndex],
    });

    const { payload } = listener.mock.calls[0][0];
    expect(payload.previousStatuses).toHaveLength(MAX_ALERTS_PER_TRIGGER);
  });

  it('logs a warning and does not rethrow if emitAlertStatusChanged throws', () => {
    jest.spyOn(bus, 'emitAlertStatusChanged').mockImplementation(() => {
      throw new Error('bus failure');
    });

    expect(() =>
      forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
        alertIds: ['a1'],
        status: 'open',
        previousStatuses: [],
        alertIdToIndex: { a1: securityAliasIndex },
        indices: [securityAliasIndex],
      })
    ).not.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to forward Cases alertStatusChanged event')
    );
  });
});
