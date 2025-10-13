/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useUserPrivileges } from '../../components/user_privileges';
import { useShowTimeline } from './use_show_timeline';

import { TestProviders } from '../../mock';
import { hasAccessToSecuritySolution } from '../../../helpers_access';
import type { LinkInfo } from '../../links';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import {
  defaultImplementation,
  withMatchedIndices,
} from '../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('../../components/user_privileges');
jest.mock('../../../helpers_access', () => ({ hasAccessToSecuritySolution: jest.fn(() => true) }));

const mockUseNormalizedAppLinks = jest.fn((): LinkInfo[] => []);
jest.mock('../../links/links_hooks', () => ({
  ...jest.requireActual('../../links/links_hooks'),
  useNormalizedAppLinks: () => mockUseNormalizedAppLinks(),
}));

const mockUseLocation = jest.fn().mockReturnValue({ pathname: '/overview' });
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

jest.mocked(useDataView).mockImplementation(withMatchedIndices);

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

const renderUseShowTimeline = () => renderHook(useShowTimeline, { wrapper: TestProviders });

describe('use show timeline', () => {
  beforeAll(() => {
    jest.clearAllMocks();

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

  it('should not show timeline when dataViewId is not null and indices does not exist', () => {
    jest.mocked(useDataView).mockImplementation(defaultImplementation);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([false]);
  });
});

describe('Security solution capabilities', () => {
  it('should show timeline when user has read capabilities', () => {
    jest.mocked(useDataView).mockImplementation(withMatchedIndices);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([true]);
  });

  it('should not show timeline when user does not have read capabilities', () => {
    jest.mocked(hasAccessToSecuritySolution).mockReturnValueOnce(false);
    const { result } = renderUseShowTimeline();
    expect(result.current).toEqual([false]);
  });
});
