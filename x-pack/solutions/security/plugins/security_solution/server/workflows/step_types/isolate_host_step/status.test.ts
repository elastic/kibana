/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveStepStatus, toEndpointResults } from './status';

type Details = Parameters<typeof toEndpointResults>[0];

const completed = { isCompleted: true, wasSuccessful: true, wasCanceled: false, errors: undefined };

const buildDetails = (overrides: Partial<Details> = {}): Details => ({
  agents: ['a1'],
  agentType: 'endpoint',
  hosts: { a1: { name: 'host-1' } },
  agentState: {
    a1: { ...completed, completedAt: '2026-10-14T10:00:00.000Z' },
  },
  ...overrides,
});

describe('isolate host step status', () => {
  describe('toEndpointResults', () => {
    it('should map a completed endpoint to success', () => {
      expect(toEndpointResults(buildDetails(), ['a1'])).toEqual([
        {
          endpoint_id: 'a1',
          agent_type: 'endpoint',
          status: 'success',
          host_name: 'host-1',
          completed_at: '2026-10-14T10:00:00.000Z',
        },
      ]);
    });

    it('should mark ids the route did not act on as dropped', () => {
      const results = toEndpointResults(buildDetails(), ['a1', 'ghost']);
      expect(results[1]).toEqual({
        endpoint_id: 'ghost',
        agent_type: 'endpoint',
        status: 'dropped',
      });
    });

    it('should join errors for a failed endpoint', () => {
      const results = toEndpointResults(
        buildDetails({
          agentState: {
            a1: {
              isCompleted: true,
              wasSuccessful: false,
              wasCanceled: false,
              errors: ['boom', 'bang'],
              completedAt: undefined,
            },
          },
        }),
        ['a1']
      );
      expect(results[0]).toMatchObject({ status: 'failed', error: 'boom; bang' });
    });

    it('should map a canceled endpoint to canceled', () => {
      const results = toEndpointResults(
        buildDetails({
          agentState: {
            a1: { ...completed, isCompleted: false, wasCanceled: true, completedAt: undefined },
          },
        }),
        ['a1']
      );
      expect(results[0].status).toBe('canceled');
    });

    it('should map an endpoint with no answer to pending', () => {
      expect(toEndpointResults(buildDetails({ agentState: {} }), ['a1'])[0].status).toBe('pending');
    });
  });

  describe('deriveStepStatus', () => {
    const result = (status: 'success' | 'failed' | 'canceled' | 'pending' | 'dropped') => ({
      endpoint_id: status,
      agent_type: 'endpoint',
      status,
    });

    it('should keep polling while an endpoint is pending before the deadline', () => {
      expect(deriveStepStatus([result('success'), result('pending')], false)).toBeUndefined();
    });

    it('should return success when every endpoint succeeded', () => {
      expect(deriveStepStatus([result('success')], false)).toBe('success');
    });

    it('should return partial when one endpoint was dropped', () => {
      expect(deriveStepStatus([result('success'), result('dropped')], false)).toBe('partial');
    });

    it('should return failed when nothing succeeded and nothing is pending', () => {
      expect(deriveStepStatus([result('failed'), result('dropped')], false)).toBe('failed');
    });

    it('should return timed_out when the deadline passes with nothing completed', () => {
      expect(deriveStepStatus([result('pending')], true)).toBe('timed_out');
    });

    it('should return partial when the deadline passes with a mix of success and pending', () => {
      expect(deriveStepStatus([result('success'), result('pending')], true)).toBe('partial');
    });

    it('should return failed when every endpoint was canceled', () => {
      expect(deriveStepStatus([result('canceled')], false)).toBe('failed');
    });
  });
});
