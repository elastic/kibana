/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { SessionsStatus } from '../../../common/sessions';
import { useSessionsStatus } from '../../application/sessions_status_provider';
import { sessionSourceOf, useFrustrationSessionSource } from './use_frustration_session_source';

jest.mock('../../application/sessions_status_provider');

const status = (overrides: Partial<SessionsStatus> = {}): SessionsStatus => ({
  installed: true,
  disabled: false,
  health: 'healthy',
  installedVersion: 1,
  currentVersion: 1,
  rebuilding: false,
  apiKeyInvalid: false,
  lagSeconds: 30,
  summarizedUntil: null,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  enabledBy: null,
  retentionDays: 30,
  canEnable: false,
  autoEnable: false,
  canManage: false,
  setUpBlocker: null,
  ...overrides,
});

const mockStatus = (state: Partial<ReturnType<typeof useSessionsStatus>>) =>
  jest.mocked(useSessionsStatus).mockReturnValue({
    status: undefined,
    loading: false,
    error: undefined,
    refresh: jest.fn(),
    enable: jest.fn(),
    enabling: false,
    enableError: undefined,
    disable: jest.fn(),
    disabling: false,
    disableError: undefined,
    ...state,
  });

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-22T12:00:00.000Z');
const LAST_DAY = NOW - DAY_MS;

describe('sessionSourceOf', () => {
  it.each([
    ['healthy summaries', status(), LAST_DAY, 'summaries'],
    ['lagging summaries', status({ health: 'lagging' }), LAST_DAY, 'events'],
    ['the oldest kept day', status(), NOW - 30 * DAY_MS, 'summaries'],
    ['a range older than the kept sessions', status(), NOW - 31 * DAY_MS, 'events'],
    [
      'sessions that are not set up',
      status({ installed: false, health: 'missing' }),
      LAST_DAY,
      'events',
    ],
    ['a first build', status({ rebuilding: true }), LAST_DAY, 'events'],
    ['a task that cannot run', status({ health: 'degraded' }), LAST_DAY, 'events'],
    [
      'sessions that were turned off',
      status({ disabled: true, health: 'disabled' }),
      LAST_DAY,
      'events',
    ],
    ['no status', undefined, LAST_DAY, 'events'],
  ])('reads %s from the %s', (_label, sessionsStatus, rangeStart, source) => {
    expect(sessionSourceOf(sessionsStatus, rangeStart, NOW)).toBe(source);
  });
});

describe('useFrustrationSessionSource', () => {
  const sourceOf = () =>
    renderHook(() => useFrustrationSessionSource(Date.now() - DAY_MS, 'scope')).result.current;

  it('keeps the source while the status changes, until the scope does', () => {
    mockStatus({ status: status() });
    const { result, rerender } = renderHook(
      ({ scope }) => useFrustrationSessionSource(Date.now() - DAY_MS, scope),
      { initialProps: { scope: 'now-24h|now|production|0' } }
    );
    expect(result.current).toBe('summaries');

    mockStatus({ status: status({ rebuilding: true }) });
    rerender({ scope: 'now-24h|now|production|0' });
    expect(result.current).toBe('summaries');

    rerender({ scope: 'now-24h|now|production|1' });
    expect(result.current).toBe('events');
  });

  it('waits for the status', () => {
    mockStatus({ loading: true });
    expect(sourceOf()).toBeUndefined();
  });

  it('reads the summaries once they are built', () => {
    mockStatus({ status: status() });
    expect(sourceOf()).toBe('summaries');
  });

  it('keeps the last status while it is checked again', () => {
    mockStatus({ status: status(), loading: true });
    expect(sourceOf()).toBe('summaries');
  });

  it('reads the events when the status fails to load', () => {
    mockStatus({ error: new Error('Forbidden') });
    expect(sourceOf()).toBe('events');
  });
});
