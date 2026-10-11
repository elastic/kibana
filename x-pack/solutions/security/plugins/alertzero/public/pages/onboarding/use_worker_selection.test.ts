/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import { useWorkers } from '../../hooks/use_workers_api';
import { useWorkerSelection } from './use_worker_selection';

jest.mock('../../hooks/use_workers_api');

const mockUseWorkers = useWorkers as jest.Mock;

const respondWith = (ids: string[]) =>
  mockUseWorkers.mockReturnValue({
    data: { workers: ids.map((id) => ({ id, enabled: true, settings: {} })) },
  });

const ALL_IDS = SYSTEM_SECURITY_WORKER_CATALOG.map(({ id }) => id);

describe('useWorkerSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    respondWith(ALL_IDS);
  });

  it('exposes every catalog worker the server returns, all enabled by default', () => {
    const { result } = renderHook(() => useWorkerSelection());
    expect(result.current.availableWorkerIds).toEqual(ALL_IDS);
    expect(result.current.enabledCount).toBe(ALL_IDS.length);
  });

  it('omits catalog workers missing from the server response', () => {
    respondWith([SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]);
    const { result } = renderHook(() => useWorkerSelection());
    expect(result.current.availableWorkerIds).toEqual([
      SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    ]);
    expect(result.current.enabledCount).toBe(1);
  });

  it('ignores server workers that are not in the catalog', () => {
    respondWith([SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, 'not-in-catalog']);
    const { result } = renderHook(() => useWorkerSelection());
    expect(result.current.availableWorkerIds).toEqual([
      SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    ]);
  });

  it('returns no workers while the server response is not available', () => {
    mockUseWorkers.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useWorkerSelection());
    expect(result.current.workers).toEqual([]);
    expect(result.current.enabledCount).toBe(0);
  });

  it('toggles a worker off and back on', () => {
    const { result } = renderHook(() => useWorkerSelection());
    act(() => result.current.toggleWorker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID, false));
    expect(result.current.workerEnabled[SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]).toBe(
      false
    );
    expect(result.current.enabledCount).toBe(ALL_IDS.length - 1);

    act(() => result.current.toggleWorker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID, true));
    expect(result.current.enabledCount).toBe(ALL_IDS.length);
  });

  it('refuses to turn off the last enabled worker', () => {
    respondWith([
      SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
      SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    ]);
    const { result } = renderHook(() => useWorkerSelection());
    act(() => result.current.toggleWorker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, false));
    act(() => result.current.toggleWorker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID, false));
    expect(result.current.enabledCount).toBe(1);
    expect(result.current.workerEnabled[SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]).toBe(
      true
    );
  });
});
