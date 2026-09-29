/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { SecuritySolutionTemplateWrapper, type SecuritySolutionTemplateWrapperProps } from '.';
import { SecurityPageName } from '../../types';

const mockUseShowTimeline = vi.fn((): [boolean] => [false]);
vi.mock('../../../common/utils/timeline/use_show_timeline', async () => {
  const mocked = {
    ...(await vi.importActual('../../../common/utils/timeline/use_show_timeline')),
    useShowTimeline: () => mockUseShowTimeline(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./timeline', async () => {
  const mocked = {
    ...(await vi.importActual('./timeline')),
    Timeline: () => <div>{'Timeline'}</div>,
  };
  return { ...mocked, default: mocked };
});

const navProps = { icon: 'logoSecurity', items: [], name: 'Security' };
const mockUseSecuritySolutionNavigation = vi.fn();
vi.mock('../../../common/components/navigation/use_security_solution_navigation', () => {
  const mocked = {
    useSecuritySolutionNavigation: () => mockUseSecuritySolutionNavigation(),
  };
  return { ...mocked, default: mocked };
});

const mockUseRouteSpy = vi.fn((): [{ pageName: string }] => [
  { pageName: SecurityPageName.alerts },
]);
vi.mock('../../../common/utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: () => mockUseRouteSpy(),
  };
  return { ...mocked, default: mocked };
});

const renderComponent = ({
  children = <div>{'child of wrapper'}</div>,
  ...props
}: SecuritySolutionTemplateWrapperProps = {}) =>
  render(
    <TestProviders>
      <SecuritySolutionTemplateWrapper {...props}>{children}</SecuritySolutionTemplateWrapper>
    </TestProviders>
  );

describe('SecuritySolutionTemplateWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSecuritySolutionNavigation.mockReturnValue(navProps);
  });

  describe('when navigation props are defined (classic nav)', () => {
    beforeEach(() => {
      mockUseSecuritySolutionNavigation.mockReturnValue(navProps);
    });
    it('should render the children', async () => {
      const { queryByText } = renderComponent();
      expect(queryByText('child of wrapper')).toBeInTheDocument();
    });
  });

  describe('when navigation props are null (project nav)', () => {
    beforeEach(() => {
      mockUseSecuritySolutionNavigation.mockReturnValue(null);
    });

    it('should render the children', async () => {
      const { queryByText } = renderComponent();
      expect(queryByText('child of wrapper')).toBeInTheDocument();
    });
  });

  describe('when navigation props are undefined (loading)', () => {
    beforeEach(() => {
      mockUseSecuritySolutionNavigation.mockReturnValue(undefined);
    });

    it('should not render the children', async () => {
      const { queryByText } = renderComponent();
      expect(queryByText('child of wrapper')).not.toBeInTheDocument();
    });
  });

  it('Should render with bottom bar when user allowed', async () => {
    mockUseShowTimeline.mockReturnValue([true]);
    const { getByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('child of wrapper')).toBeInTheDocument();
      expect(getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('Should not show bottom bar when user not allowed', async () => {
    mockUseShowTimeline.mockReturnValue([false]);

    const { getByText, queryByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('child of wrapper')).toBeInTheDocument();
      expect(queryByText('Timeline')).not.toBeInTheDocument();
    });
  });

  it('Should render emptyPageBody when isEmptyState is true', async () => {
    mockUseShowTimeline.mockReturnValue([false]);

    const { getByText } = renderComponent({
      isEmptyState: true,
      emptyPageBody: <div>{'empty page body'}</div>,
      children: null,
    });

    expect(getByText('empty page body')).toBeInTheDocument();
  });
});
