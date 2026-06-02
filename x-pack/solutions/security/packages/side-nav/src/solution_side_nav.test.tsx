/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SolutionSideNav } from './solution_side_nav';
import type { SolutionSideNavProps } from './solution_side_nav';
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
  {
    id: 'rulesLanding',
    label: 'Rules',
    href: '/rules',
    items: [
      {
        id: 'rulesManagement',
        label: 'Rules Management',
        href: '/rules-management',
        description: 'Rules Management description',
      },
    ],
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
      ).toBe('/overview');
      expect(result.getByTestId(`solutionSideNavItemLink-${'alerts'}`).getAttribute('href')).toBe(
        '/alerts'
      );
    });

    it('should call onClick callback if link clicked', async () => {
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
      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'exploreLanding'}`));
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('renders right arrow hint when item has children', () => {
      const result = renderNav({
        items: mockItems,
        selectedId: 'rules',
      });

      expect(result.getByTestId('solutionSideNavItemPanelHint-rulesLanding')).toBeInTheDocument();
    });

    it('should send telemetry when a link without children is clicked', async () => {
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
        },
      ];
      const result = renderNav({ items });
      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'exploreLanding'}`));
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.NAVIGATION}${'exploreLanding'}`
      );
    });

    it('should send telemetry when a parent link is clicked', async () => {
      const result = renderNav();
      expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'dashboardsLanding'}`));
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}${'dashboardsLanding'}`
      );
    });

    it('should render the sub-nav panel when link is clicked', async () => {
      const result = renderNav();
      expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'dashboardsLanding'}`));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();
    });

    it('should close the sub-nav panel when the same link is clicked', async () => {
      const result = renderNav();
      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'dashboardsLanding'}`));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'dashboardsLanding'}`));

      // add check at the end of the event loop to ensure the panel is removed
      setTimeout(() => {
        expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();
      });
    });

    it('should open relevant sub-nav panel when another link is clicked while sub-nav is open', async () => {
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

      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'dashboardsLanding'}`));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemLink-${'exploreLanding'}`));
      expect(result.queryByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Users')).toBeInTheDocument();
    });
  });
});
