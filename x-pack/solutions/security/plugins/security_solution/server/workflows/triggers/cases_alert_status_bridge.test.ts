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
  let mockLogger: Pick<Logger, 'warn' | 'debug'>;

  beforeEach(() => {
    bus = new SecuritySolutionEventBus();
    mockLogger = { warn: jest.fn(), debug: jest.fn() };
  });

  afterEach(() => {
    bus.removeAllListeners();
  });

  const securityAliasIndex = '.alerts-security.alerts-default';
  const securityBackingIndex = '.internal.alerts-security.alerts-default-000001';
  const siemSignalsIndex = '.siem-signals-default-000001';
  const scheduledAdIndex = '.alerts-security.attack.discovery.alerts-default';
  const adhocAdIndex = '.adhoc.alerts-security.attack.discovery.alerts-default';
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

  it('emits only security alertIds when case has mixed Security Solution and observability alerts', () => {
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

  it('emits when index is a concrete backing index (.internal.alerts-security.*)', () => {
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

    // Use status: 'closed' so all IDs (previously 'open') are genuinely transitioning and
    // not filtered by the no-op check before the cap is applied.
    const oversizedPrev = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 3 }, (_, i) => ({
      id: `id-${i}`,
      previousStatus: 'open' as const,
    }));
    const oversizedIds = oversizedPrev.map((p) => p.id);
    const alertIdToIndex = Object.fromEntries(oversizedIds.map((id) => [id, securityAliasIndex]));
    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: oversizedIds,
      status: 'closed',
      previousStatuses: oversizedPrev,
      alertIdToIndex,
      indices: [securityAliasIndex],
    });

    const { payload } = listener.mock.calls[0][0];
    expect(payload.previousStatuses).toHaveLength(MAX_ALERTS_PER_TRIGGER);
  });

  it('does not emit for IDs already at the target status (confirmed no-ops)', () => {
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: ['a1', 'a2', 'a3'],
      status: 'acknowledged',
      previousStatuses: [
        { id: 'a1', previousStatus: 'acknowledged' }, // already at target → no-op
        { id: 'a2', previousStatus: 'open' }, // transitioning
        // a3 has no previousStatuses entry → unknown, treat as changing
      ],
      alertIdToIndex: {
        a1: securityAliasIndex,
        a2: securityAliasIndex,
        a3: securityAliasIndex,
      },
      indices: [securityAliasIndex],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).not.toContain('a1');
    expect(payload.alertIds).toContain('a2');
    expect(payload.alertIds).toContain('a3');
  });

  it('excludes previousStatuses entries for IDs truncated from the emitted alertIds list', () => {
    // id-0 has no previousStatuses entry (e.g. unrecognised stored status); id-1..id-10000 do.
    // Without the fix, previousStatuses would include {id-10000} even though id-10000 is not
    // in the emitted alertIds (which caps at MAX_ALERTS_PER_TRIGGER = id-0..id-9999).
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
    const prevWithoutFirst = Array.from({ length: MAX_ALERTS_PER_TRIGGER }, (_, i) => ({
      id: `id-${i + 1}`,
      previousStatus: 'open' as const,
    }));
    const alertIdToIndex = Object.fromEntries(oversizedIds.map((id) => [id, securityAliasIndex]));
    forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
      alertIds: oversizedIds,
      status: 'closed',
      previousStatuses: prevWithoutFirst,
      alertIdToIndex,
      indices: [securityAliasIndex],
    });

    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toHaveLength(MAX_ALERTS_PER_TRIGGER);
    // id-10000 was truncated from alertIds and must be absent from previousStatuses too
    expect(
      payload.previousStatuses.find(
        (ps: { id: string }) => ps.id === `id-${MAX_ALERTS_PER_TRIGGER}`
      )
    ).toBeUndefined();
    // Only id-1..id-9999 are in both the capped alertIds and previousStatuses (9999 entries)
    expect(payload.previousStatuses).toHaveLength(MAX_ALERTS_PER_TRIGGER - 1);
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
      expect.stringContaining('Failed to emit alertStatusChanged workflow trigger')
    );
  });

  it('still emits alertStatusChanged when attackStatusChanged throws in a mixed batch', () => {
    jest.spyOn(bus, 'emitAttackStatusChanged').mockImplementation(() => {
      throw new Error('attack bus failure');
    });
    const alertListener = jest.fn();
    bus.onAlertStatusChanged(alertListener);

    expect(() =>
      forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
        alertIds: ['alert-1', 'attack-1'],
        status: 'closed',
        previousStatuses: [],
        alertIdToIndex: {
          'alert-1': securityAliasIndex,
          'attack-1': scheduledAdIndex,
        },
        indices: [securityAliasIndex, scheduledAdIndex],
      })
    ).not.toThrow();

    expect(alertListener).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to emit attackStatusChanged workflow trigger')
    );
  });

  describe('attack discovery index routing', () => {
    it('emits attackStatusChanged (not alertStatusChanged) for scheduled AD docs', () => {
      const alertListener = jest.fn();
      const attackListener = jest.fn();
      bus.onAlertStatusChanged(alertListener);
      bus.onAttackStatusChanged(attackListener);

      forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
        alertIds: ['attack-1'],
        status: 'closed',
        previousStatuses: [{ id: 'attack-1', previousStatus: 'open' }],
        alertIdToIndex: { 'attack-1': scheduledAdIndex },
        indices: [scheduledAdIndex],
      });

      expect(attackListener).toHaveBeenCalledTimes(1);
      expect(alertListener).not.toHaveBeenCalled();
      const { payload } = attackListener.mock.calls[0][0];
      expect(payload.attackIds).toEqual(['attack-1']);
      expect(payload.status).toBe('closed');
      expect(payload.previousStatuses).toEqual([{ id: 'attack-1', previousStatus: 'open' }]);
      expect(payload.truncated).toBe(false);
    });

    it('emits attackStatusChanged (not alertStatusChanged) for adhoc AD docs', () => {
      const alertListener = jest.fn();
      const attackListener = jest.fn();
      bus.onAlertStatusChanged(alertListener);
      bus.onAttackStatusChanged(attackListener);

      forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
        alertIds: ['attack-1'],
        status: 'acknowledged',
        previousStatuses: [{ id: 'attack-1', previousStatus: 'open' }],
        alertIdToIndex: { 'attack-1': adhocAdIndex },
        indices: [adhocAdIndex],
      });

      expect(attackListener).toHaveBeenCalledTimes(1);
      expect(alertListener).not.toHaveBeenCalled();
      expect(attackListener.mock.calls[0][0].payload.attackIds).toEqual(['attack-1']);
    });

    it('emits both attackStatusChanged and alertStatusChanged for a mixed batch', () => {
      const alertListener = jest.fn();
      const attackListener = jest.fn();
      bus.onAlertStatusChanged(alertListener);
      bus.onAttackStatusChanged(attackListener);

      forwardCasesAlertStatusToSecuritySolution(bus, mockLogger as Logger, mockRequest, {
        alertIds: ['alert-1', 'attack-1', 'attack-2'],
        status: 'closed',
        previousStatuses: [
          { id: 'alert-1', previousStatus: 'open' },
          { id: 'attack-1', previousStatus: 'open' },
          { id: 'attack-2', previousStatus: 'acknowledged' },
        ],
        alertIdToIndex: {
          'alert-1': securityAliasIndex,
          'attack-1': scheduledAdIndex,
          'attack-2': adhocAdIndex,
        },
        indices: [securityAliasIndex, scheduledAdIndex, adhocAdIndex],
      });

      expect(attackListener).toHaveBeenCalledTimes(1);
      expect(alertListener).toHaveBeenCalledTimes(1);

      const attackPayload = attackListener.mock.calls[0][0].payload;
      expect(attackPayload.attackIds).toEqual(['attack-1', 'attack-2']);
      expect(attackPayload.previousStatuses).toEqual([
        { id: 'attack-1', previousStatus: 'open' },
        { id: 'attack-2', previousStatus: 'acknowledged' },
      ]);

      const alertPayload = alertListener.mock.calls[0][0].payload;
      expect(alertPayload.alertIds).toEqual(['alert-1']);
      expect(alertPayload.previousStatuses).toEqual([{ id: 'alert-1', previousStatus: 'open' }]);
    });
  });
});
