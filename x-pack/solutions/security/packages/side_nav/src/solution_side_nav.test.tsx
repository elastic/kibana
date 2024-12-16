/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SolutionSideNav, type SolutionSideNavProps } from './solution_side_nav';
import type { SolutionSideNavItem } from './types';
import { METRIC_TYPE } from '@kbn/analytics';
import { TELEMETRY_EVENT } from './telemetry/const';

const mockTrack = jest.fn();

const mockItems: SolutionSideNavItem[] = [
  {
    id: 'dashboardsLanding',
    label: 'Dashboards',
    href: '/dashboards',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        href: '/overview',
        description: 'Overview description',
      },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    href: '/alerts',
  },
];

const renderNav = (props: Partial<SolutionSideNavProps> = {}) =>
  render(
    <SolutionSideNav items={mockItems} selectedId={'alerts'} tracker={mockTrack} {...props} />
  );

describe('SolutionSideNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all main items', () => {
    const result = renderNav();
    expect(result.getByText('Dashboards')).toBeInTheDocument();
    expect(result.getByText('Alerts')).toBeInTheDocument();
  });

  describe('links', () => {
    it('should contain correct href in links', () => {
      const result = renderNav();
      expect(
        result.getByTestId(`solutionSideNavItemLink-${'dashboardsLanding'}`).getAttribute('href')
      ).toBe('/dashboards');
      expect(result.getByTestId(`solutionSideNavItemLink-${'alerts'}`).getAttribute('href')).toBe(
        '/alerts'
      );
    });

    it('should call onClick callback if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
          onClick: mockOnClick,
        },
      ];
      const result = renderNav({ items });
      result.getByTestId(`solutionSideNavItemLink-${'exploreLanding'}`).click();
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should send telemetry if link clicked', () => {
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
        },
      ];
      const result = renderNav({ items });
      result.getByTestId(`solutionSideNavItemLink-${'exploreLanding'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.NAVIGATION}${'exploreLanding'}`
      );
    });
  });

  describe('panel button toggle', () => {
    it('should render the panel button only for nav items', () => {
      const result = renderNav();
      expect(
        result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`)
      ).toBeInTheDocument();
      expect(result.queryByTestId(`solutionSideNavItemButton-${'alerts'}`)).not.toBeInTheDocument();
    });

    it('should render the panel when button is clicked', () => {
      const result = renderNav();
      expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();

      result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`).click();
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();
    });

    it('should telemetry when button is clicked', () => {
      const result = renderNav();
      expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();

      result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}${'dashboardsLanding'}`
      );
    });

    it('should close the panel when the same button is clicked', () => {
      const result = renderNav();
      result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`).click();
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();

      result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`).click();

      // add check at the end of the event loop to ensure the panel is removed
      setTimeout(() => {
        expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();
      });
    });

    it('should open other panel when other button is clicked while open', () => {
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
          items: [
            {
              id: 'users',
              label: 'Users',
              href: '/users',
              description: 'Users description',
            },
          ],
        },
      ];
      const result = renderNav({ items });

      result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`).click();
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();

      result.getByTestId(`solutionSideNavItemButton-${'exploreLanding'}`).click();
      expect(result.queryByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Users')).toBeInTheDocument();
    });
  });
});
