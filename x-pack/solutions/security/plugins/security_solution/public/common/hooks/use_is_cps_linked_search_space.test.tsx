/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { ICPSManager } from '@kbn/cps-utils';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import type { StartServices } from '../../types';
import { TestProviders, kibanaMock } from '../mock';
import { useIsCpsLinkedSearchSpace } from './use_is_cps_linked_search_space';

const createCpsManager = ({
  hasLinkedProjects,
  defaultProjectRouting = PROJECT_ROUTING.ALL,
}: {
  hasLinkedProjects: boolean;
  defaultProjectRouting?: string;
}): ICPSManager =>
  ({
    whenReady: jest.fn().mockResolvedValue(undefined),
    hasLinkedProjects: jest.fn().mockReturnValue(hasLinkedProjects),
    getDefaultProjectRouting: jest.fn().mockReturnValue(defaultProjectRouting),
  } as unknown as ICPSManager);

const startServicesWithCps = (
  hasLinkedProjects: boolean,
  defaultProjectRouting: string = PROJECT_ROUTING.ALL
): StartServices => ({
  ...kibanaMock,
  cps: {
    cpsManager: createCpsManager({ hasLinkedProjects, defaultProjectRouting }),
    isTierEligible: true,
  },
});

const renderUseIsCpsLinkedSearchSpace = (startServices?: StartServices) =>
  renderHook(() => useIsCpsLinkedSearchSpace(), {
    wrapper: ({ children }) => (
      <TestProviders startServices={startServices}>{children}</TestProviders>
    ),
  });

describe('useIsCpsLinkedSearchSpace', () => {
  it('returns not a linked-search space immediately when CPS is unavailable', () => {
    const { result } = renderUseIsCpsLinkedSearchSpace(kibanaMock);

    expect(result.current).toEqual({ isReady: true, isLinkedSearchSpace: false });
  });

  it('returns a linked-search space when there are linked projects and routing is not origin-only', async () => {
    const { result } = renderUseIsCpsLinkedSearchSpace(startServicesWithCps(true));

    await waitFor(() => {
      expect(result.current).toEqual({ isReady: true, isLinkedSearchSpace: true });
    });
  });

  it('returns not a linked-search space when there are no linked projects', async () => {
    const startServices = startServicesWithCps(false);
    const { result } = renderUseIsCpsLinkedSearchSpace(startServices);

    await waitFor(() => {
      expect(startServices.cps!.cpsManager!.whenReady).toHaveBeenCalled();
    });
    expect(result.current).toEqual({ isReady: true, isLinkedSearchSpace: false });
  });

  it('returns not a linked-search space when routing is origin-only', async () => {
    const { result } = renderUseIsCpsLinkedSearchSpace(
      startServicesWithCps(true, PROJECT_ROUTING.ORIGIN)
    );

    await waitFor(() => {
      expect(result.current).toEqual({ isReady: true, isLinkedSearchSpace: false });
    });
  });
});
