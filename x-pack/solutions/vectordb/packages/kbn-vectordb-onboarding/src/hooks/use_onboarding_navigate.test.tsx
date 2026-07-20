/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { useOnboardingNavigate } from './use_onboarding_navigate';
import { useKibana } from '../services';

jest.mock('../services');

const useKibanaMock = useKibana as jest.Mock;

const getUrlForApp = jest.fn(
  (appId: string, { path }: { path?: string } = {}) => `/app/${appId}${path ?? ''}`
);
const navigateToUrl = jest.fn();

const mockApplication = (
  currentAppId$: BehaviorSubject<string | undefined> | Subject<string | undefined>
) => {
  useKibanaMock.mockReturnValue({
    services: { application: { currentAppId$, getUrlForApp, navigateToUrl } },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useOnboardingNavigate', () => {
  it('resolves the path against the current app and navigates, forwarding the origin as state', () => {
    mockApplication(new BehaviorSubject<string | undefined>('vectordb'));

    const { result } = renderHook(() => useOnboardingNavigate('/tutorials'));

    act(() => {
      result.current('/onboarding/ingest?path=have-vectors');
    });

    expect(getUrlForApp).toHaveBeenCalledWith('vectordb', {
      path: '/onboarding/ingest?path=have-vectors',
    });
    expect(navigateToUrl).toHaveBeenCalledWith(
      '/app/vectordb/onboarding/ingest?path=have-vectors',
      {
        state: { origin: '/tutorials' },
      }
    );
  });

  it('does not navigate while the current app id is not yet resolved', () => {
    mockApplication(new Subject<string | undefined>());

    const { result } = renderHook(() => useOnboardingNavigate('/tutorials'));

    act(() => {
      result.current('/onboarding/ingest');
    });

    expect(getUrlForApp).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });
});
