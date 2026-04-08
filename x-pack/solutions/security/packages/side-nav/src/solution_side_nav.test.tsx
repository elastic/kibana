/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

    it('should send telemetry if link clicked', async () => {
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
  });

  describe('panel button toggle', () => {
    it('should render the panel button only for nav items', () => {
      const result = renderNav();
      expect(
        result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`)
      ).toBeInTheDocument();
      expect(result.queryByTestId(`solutionSideNavItemButton-${'alerts'}`)).not.toBeInTheDocument();
    });

    it('should render the panel when button is clicked', async () => {
      const result = renderNav();
      expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();
    });

    it('should telemetry when button is clicked', async () => {
      const result = renderNav();
      expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`));
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}${'dashboardsLanding'}`
      );
    });

    it('should close the panel when the same button is clicked', async () => {
      const result = renderNav();
      await userEvent.click(result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`));

      // add check at the end of the event loop to ensure the panel is removed
      setTimeout(() => {
        expect(result.queryByTestId('solutionSideNavPanel')).not.toBeInTheDocument();
      });
    });

    it('should open other panel when other button is clicked while open', async () => {
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

      await userEvent.click(result.getByTestId(`solutionSideNavItemButton-${'dashboardsLanding'}`));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();

      await userEvent.click(result.getByTestId(`solutionSideNavItemButton-${'exploreLanding'}`));
      expect(result.queryByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Users')).toBeInTheDocument();
    });
  });

  describe('unifiedRow interaction variant', () => {
    const firstChildOnClick = jest.fn((ev: { preventDefault: () => void }) => {
      ev.preventDefault();
    });
    const panelItems: SolutionSideNavItem[] = [
      {
        id: 'dashboardsLanding',
        label: 'Dashboards',
        href: '/dashboards',
        items: [
          {
            id: 'overview',
            label: 'Overview',
            href: '/overview-first',
            onClick: firstChildOnClick,
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
        id: 'Rules',
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

    beforeEach(() => {
      firstChildOnClick.mockClear();
    });

    it('renders arrow hint instead of split panel button when item has children', () => {
      const result = renderNav({
        items: panelItems,
        navLinkInteractionVariant: 'unifiedRow',
        selectedId: 'alerts',
      });
      expect(
        result.queryByTestId('solutionSideNavItemButton-dashboardsLanding')
      ).not.toBeInTheDocument();
      expect(
        result.getByTestId('solutionSideNavItemPanelHint-dashboardsLanding')
      ).toBeInTheDocument();
    });

    it('uses first child href on the parent row link', () => {
      const result = renderNav({
        items: panelItems,
        navLinkInteractionVariant: 'unifiedRow',
        selectedId: 'alerts',
      });
      expect(
        result.getByTestId('solutionSideNavItemLink-dashboardsLanding').getAttribute('href')
      ).toBe('/overview-first');
    });

    it('clicking the parent row opens the panel', async () => {
      const result = renderNav({
        items: panelItems,
        navLinkInteractionVariant: 'unifiedRow',
        selectedId: 'alerts',
      });
      await userEvent.click(result.getByTestId('solutionSideNavItemLink-dashboardsLanding'));
      expect(result.getByTestId('solutionSideNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.PANEL_NAVIGATION_TOGGLE}dashboardsLanding`
      );
    });

    it('should not show panel button in unifiedRow variant', () => {
      const result = renderNav({
        items: panelItems,
        navLinkInteractionVariant: 'unifiedRow',
        selectedId: 'alerts',
      });
      // Panel button should not exist for items with children in unifiedRow mode
      expect(
        result.queryByTestId('solutionSideNavItemButton-dashboardsLanding')
      ).not.toBeInTheDocument();
      expect(result.queryByTestId('solutionSideNavItemButton-Rules')).not.toBeInTheDocument();
    });

    it('should navigate directly when clicking item without children in unifiedRow mode', async () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const itemsWithoutChildren: SolutionSideNavItem[] = [
        {
          id: 'alerts',
          label: 'Alerts',
          href: '/alerts',
          onClick: mockOnClick,
        },
      ];
      const result = renderNav({
        items: itemsWithoutChildren,
        navLinkInteractionVariant: 'unifiedRow',
        selectedId: 'alerts',
      });
      await userEvent.click(result.getByTestId('solutionSideNavItemLink-alerts'));
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('navLinkInteractionVariant attribute', () => {
    it('should use splitButton as default variant', () => {
      const result = renderNav();
      // In splitButton mode, panel button should be visible for items with children
      expect(result.getByTestId('solutionSideNavItemButton-dashboardsLanding')).toBeInTheDocument();
    });

    it('should apply unifiedRow variant correctly', () => {
      const result = renderNav({
        items: mockItems,
        navLinkInteractionVariant: 'unifiedRow',
        selectedId: 'alerts',
      });
      // In unifiedRow mode, arrow hint should show instead of button
      expect(
        result.getByTestId('solutionSideNavItemPanelHint-dashboardsLanding')
      ).toBeInTheDocument();
      expect(
        result.queryByTestId('solutionSideNavItemButton-dashboardsLanding')
      ).not.toBeInTheDocument();
    });

    it('should switch between variants correctly', () => {
      const { rerender } = render(
        <SolutionSideNav
          items={mockItems}
          selectedId={'alerts'}
          navLinkInteractionVariant="splitButton"
          tracker={mockTrack}
        />
      );

      // Check splitButton mode
      expect(screen.getByTestId('solutionSideNavItemButton-dashboardsLanding')).toBeInTheDocument();

      // Re-render with unifiedRow
      rerender(
        <SolutionSideNav
          items={mockItems}
          selectedId={'alerts'}
          navLinkInteractionVariant="unifiedRow"
          tracker={mockTrack}
        />
      );

      // Check unifiedRow mode
      expect(
        screen.getByTestId('solutionSideNavItemPanelHint-dashboardsLanding')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('solutionSideNavItemButton-dashboardsLanding')
      ).not.toBeInTheDocument();
    });
  });
});
