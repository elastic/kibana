/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useJourneySteps } from './use_journey_steps';
import { fetchJourneyAction } from '../../../state';

const mockDispatch = vi.fn();
vi.mock('react-redux-v7', () => {
  const actual = require('react-redux-v7');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: () => undefined,
  };
});

vi.mock('react-router-dom', () => {
      const mocked = {
      useParams: () => ({ checkGroupId: 'cg-from-url', stepIndex: '1' }),
    };
      return { ...mocked, default: mocked };
    });

const mockUrlParams = vi.fn();
vi.mock('../../../hooks', () => {
      const mocked = {
      useGetUrlParams: () => mockUrlParams(),
    };
      return { ...mocked, default: mocked };
    });

describe('useJourneySteps', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
  });

  afterEach(() => vi.clearAllMocks());

  // `fetchJourneyAction.get` stamps `meta.dispatchedAt` with `Date.now()` via
  // its `prepareForTimestamp` helper, so two invocations of `.get(payload)`
  // never deep-equal each other. We inspect the dispatched action's `type`
  // and `payload` directly instead.

  it('dispatches fetchJourneyAction with undefined remoteName for local monitors', () => {
    renderHook(() => useJourneySteps({ checkGroup: 'cg-explicit' }));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatched = mockDispatch.mock.calls[0][0];
    expect(dispatched.type).toBe(fetchJourneyAction.get.type);
    expect(dispatched.payload).toEqual({ checkGroup: 'cg-explicit', remoteName: undefined });
  });

  it('forwards the URL remoteName for remote monitors', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    renderHook(() => useJourneySteps({ checkGroup: 'cg-explicit' }));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatched = mockDispatch.mock.calls[0][0];
    expect(dispatched.type).toBe(fetchJourneyAction.get.type);
    expect(dispatched.payload).toEqual({ checkGroup: 'cg-explicit', remoteName: 'remote-a' });
  });

  it('falls back to the URL checkGroupId when no explicit checkGroup is passed', () => {
    renderHook(() => useJourneySteps());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatched = mockDispatch.mock.calls[0][0];
    expect(dispatched.payload).toEqual({ checkGroup: 'cg-from-url', remoteName: undefined });
  });

  it('forwards stepsOnly so the server can skip the journey-details lookup', () => {
    renderHook(() => useJourneySteps({ checkGroup: 'cg-explicit', stepsOnly: true }));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatched = mockDispatch.mock.calls[0][0];
    expect(dispatched.type).toBe(fetchJourneyAction.get.type);
    expect(dispatched.payload).toEqual({
      checkGroup: 'cg-explicit',
      remoteName: undefined,
      stepsOnly: true,
    });
  });
});
