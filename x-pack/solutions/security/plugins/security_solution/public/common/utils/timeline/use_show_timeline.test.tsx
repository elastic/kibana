/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useUserPrivileges } from '../../components/user_privileges';
import { useShowTimeline } from './use_show_timeline';

import { EVENT_FILTERS_PATH, TRUSTED_APPS_PATH } from '../../../../common/constants';
import { TestProviders } from '../../mock';
import { hasAccessToSecuritySolution } from '../../../helpers_access';
import type { LinkInfo } from '../../links';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import {
  defaultImplementation,
  withMatchedIndices,
} from '../../../data_view_manager/hooks/__mocks__/use_data_view';

vi.mock('../../components/user_privileges');
vi.mock('../../../helpers_access', () => {
  const mocked = { hasAccessToSecuritySolution: vi.fn(() => true) };
  return { ...mocked, default: mocked };
});

const mockUseNormalizedAppLinks = vi.fn((): LinkInfo[] => []);
vi.mock('../../links/links_hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../links/links_hooks')),
    useNormalizedAppLinks: () => mockUseNormalizedAppLinks(),
  };
  return { ...mocked, default: mocked };
});

const mockUseLocation = vi.fn().mockReturnValue({ pathname: '/overview' });
vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

vi.mocked(useDataView).mockImplementation(withMatchedIndices);

const mockUseUserPrivileges = useUserPrivileges as Mock;

const renderUseShowTimeline = () => renderHook(useShowTimeline, { wrapper: TestProviders });

describe('use show timeline', () => {
  beforeAll(() => {
    vi.clearAllMocks();

    mockUseUserPrivileges.mockReturnValue({ timelinePrivileges: { read: true } });
    mockUseNormalizedAppLinks.mockReturnValue([
      { path: '/rules' },
      { path: '/rules/add_rules', hideTimeline: true },
      { path: '/administration/policy', hideTimeline: true },
    ] as LinkInfo[]);
  });

  it('shows timeline for routes on default', async () => {
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([true]));
  });

  it('hides timeline for blacklist routes', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/rules/add_rules' });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([false]));
  });

  it('shows timeline for partial blacklist routes', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/rules' });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([true]));
  });

  it('hides timeline for sub blacklist routes', async () => {
    mockUseLocation.mockReturnValueOnce({ pathname: '/administration/policy' });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([false]));
  });

  it('hides timeline on artifact tab routes when link path targets a different tab', async () => {
    mockUseNormalizedAppLinks.mockReturnValueOnce([
      {
        id: SecurityPageName.artifacts,
        path: EVENT_FILTERS_PATH,
        hideTimeline: true,
      },
    ] as LinkInfo[]);
    mockUseLocation.mockReturnValueOnce({ pathname: TRUSTED_APPS_PATH });
    const { result } = renderUseShowTimeline();
    await waitFor(() => expect(result.current).toEqual([false]));
  });

  it('hides timeline for users without timeline access', async () => {
    mockUseUserPrivileges.mockReturnValue({ timelinePrivileges: { read: false } });

    const { result } = renderUseShowTimeline();
    const showTimeline = result.current;
    expect(showTimeline).toEqual([false]);
  });
});
it('shows timeline for users with timeline read access', async () => {
  mockUseUserPrivileges.mockReturnValue({ timelinePrivileges: { read: true } });

  const { result } = renderUseShowTimeline();
  const showTimeline = result.current;
  expect(showTimeline).toEqual([true]);
});

describe('sourcererDataView', () => {
  it('should show timeline when indices exist', () => {
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should show timeline when dataViewId is null', () => {
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should show timeline even when indices do not exist (data view state does not gate visibility)', () => {
    vi.mocked(useDataView).mockImplementation(defaultImplementation);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });
});

describe('Security solution capabilities', () => {
  it('should show timeline when user has read capabilities', () => {
    vi.mocked(useDataView).mockImplementation(withMatchedIndices);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should not show timeline when user does not have read capabilities', () => {
    vi.mocked(hasAccessToSecuritySolution).mockReturnValueOnce(false);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([false]);
  });
});
