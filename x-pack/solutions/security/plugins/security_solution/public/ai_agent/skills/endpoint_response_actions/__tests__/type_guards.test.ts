/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isActionType,
  isHostRef,
  isActionIntent,
  isActionResult,
  isPendingActionState,
} from '../types';

describe('type guards', () => {
  describe('isActionType', () => {
    it('returns true for "isolate"', () => {
      expect(isActionType('isolate')).toBe(true);
    });

    it('returns true for "unisolate"', () => {
      expect(isActionType('unisolate')).toBe(true);
    });

    it('returns false for invalid strings', () => {
      expect(isActionType('kill')).toBe(false);
      expect(isActionType('')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(isActionType(123)).toBe(false);
      expect(isActionType(null)).toBe(false);
      expect(isActionType(undefined)).toBe(false);
      expect(isActionType({})).toBe(false);
    });
  });

  describe('isHostRef', () => {
    it('returns true for a valid HostRef', () => {
      const host = { hostName: 'WIN-PROD-042', agentId: 'agent-001', isIsolated: false };
      expect(isHostRef(host)).toBe(true);
    });

    it('returns true when isIsolated is true', () => {
      const host = { hostName: 'WIN-PROD-042', agentId: 'agent-001', isIsolated: true };
      expect(isHostRef(host)).toBe(true);
    });

    it('returns false when hostName is missing', () => {
      expect(isHostRef({ agentId: 'agent-001', isIsolated: false })).toBe(false);
    });

    it('returns false when agentId is missing', () => {
      expect(isHostRef({ hostName: 'WIN-PROD-042', isIsolated: false })).toBe(false);
    });

    it('returns false when isIsolated is missing', () => {
      expect(isHostRef({ hostName: 'WIN-PROD-042', agentId: 'agent-001' })).toBe(false);
    });

    it('returns false when hostName is not a string', () => {
      expect(isHostRef({ hostName: 123, agentId: 'agent-001', isIsolated: false })).toBe(false);
    });

    it('returns false when agentId is not a string', () => {
      expect(isHostRef({ hostName: 'WIN-PROD-042', agentId: 123, isIsolated: false })).toBe(false);
    });

    it('returns false when isIsolated is not a boolean', () => {
      expect(isHostRef({ hostName: 'WIN-PROD-042', agentId: 'agent-001', isIsolated: 'yes' })).toBe(
        false
      );
    });

    it('returns false for null', () => {
      expect(isHostRef(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isHostRef('host')).toBe(false);
    });
  });

  describe('isActionIntent', () => {
    it('returns true for a valid ActionIntent', () => {
      const intent = { type: 'isolate', hostName: 'WIN-PROD-042' };
      expect(isActionIntent(intent)).toBe(true);
    });

    it('returns true when rawInput is provided', () => {
      const intent = { type: 'unisolate', hostName: 'WIN-PROD-042', rawInput: 'Unisolate WIN-PROD-042' };
      expect(isActionIntent(intent)).toBe(true);
    });

    it('returns false when type is invalid', () => {
      expect(isActionIntent({ type: 'kill', hostName: 'WIN-PROD-042' })).toBe(false);
    });

    it('returns false when hostName is missing', () => {
      expect(isActionIntent({ type: 'isolate' })).toBe(false);
    });

    it('returns false when hostName is not a string', () => {
      expect(isActionIntent({ type: 'isolate', hostName: 123 })).toBe(false);
    });

    it('returns false when rawInput is not a string', () => {
      expect(isActionIntent({ type: 'isolate', hostName: 'WIN-PROD-042', rawInput: 123 })).toBe(
        false
      );
    });

    it('returns false for null', () => {
      expect(isActionIntent(null)).toBe(false);
    });

    it('returns false for a primitive', () => {
      expect(isActionIntent('isolate')).toBe(false);
    });
  });

  describe('isActionResult', () => {
    it('returns true for a valid completed ActionResult', () => {
      const result = {
        actionId: 'action-001',
        status: 'completed',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      expect(isActionResult(result)).toBe(true);
    });

    it('returns true for a failed ActionResult with errorMessage', () => {
      const result = {
        actionId: 'action-001',
        status: 'failed',
        errorMessage: 'Endpoint offline',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      expect(isActionResult(result)).toBe(true);
    });

    it('returns true for a pending ActionResult', () => {
      const result = {
        actionId: 'action-001',
        status: 'pending',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      expect(isActionResult(result)).toBe(true);
    });

    it('returns false when actionId is missing', () => {
      expect(isActionResult({ status: 'completed', timestamp: '2024-01-01T00:00:00.000Z' })).toBe(
        false
      );
    });

    it('returns false when status is invalid', () => {
      expect(
        isActionResult({ actionId: 'action-001', status: 'unknown', timestamp: '2024-01-01T00:00:00.000Z' })
      ).toBe(false);
    });

    it('returns false when timestamp is missing', () => {
      expect(isActionResult({ actionId: 'action-001', status: 'completed' })).toBe(false);
    });

    it('returns false when errorMessage is not a string', () => {
      expect(
        isActionResult({
          actionId: 'action-001',
          status: 'failed',
          errorMessage: 123,
          timestamp: '2024-01-01T00:00:00.000Z',
        })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isActionResult(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isActionResult('completed')).toBe(false);
    });
  });

  describe('isPendingActionState', () => {
    it('returns true for a valid PendingActionState', () => {
      const state = { actionId: 'action-001', status: 'pending' };
      expect(isPendingActionState(state)).toBe(true);
    });

    it('returns true for completed status', () => {
      const state = { actionId: 'action-001', status: 'completed' };
      expect(isPendingActionState(state)).toBe(true);
    });

    it('returns true for failed status', () => {
      const state = { actionId: 'action-001', status: 'failed' };
      expect(isPendingActionState(state)).toBe(true);
    });

    it('returns false when actionId is missing', () => {
      expect(isPendingActionState({ status: 'pending' })).toBe(false);
    });

    it('returns false when status is invalid', () => {
      expect(isPendingActionState({ actionId: 'action-001', status: 'unknown' })).toBe(false);
    });

    it('returns false when actionId is not a string', () => {
      expect(isPendingActionState({ actionId: 123, status: 'pending' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPendingActionState(null)).toBe(false);
    });

    it('returns false for a primitive', () => {
      expect(isPendingActionState('pending')).toBe(false);
    });
  });
});
