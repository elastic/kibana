/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { SecurityPageName } from '../../../../app/types';
import { TestProviders } from '../../../mock';
import { BOTTOM_BAR_HEIGHT, EUI_HEADER_HEIGHT, SecuritySideNav } from './security_side_nav';
import type { SolutionSideNavProps } from '@kbn/security-solution-side-nav';
import type { NavigationLink } from '../../../links/types';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { getNavCategories } from './categories';

const settingsNavLink: NavigationLink = {
  id: SecurityPageName.administration,
  title: 'Settings',
  description: 'Settings description',
  categories: [{ label: 'test category', linkIds: [SecurityPageName.endpoints] }],
  links: [
    {
      id: SecurityPageName.endpoints,
      title: 'title 2',
      description: 'description 2',
      isBeta: true,
    },
  ],
};
const alertsNavLink: NavigationLink = {
  id: SecurityPageName.alerts,
  title: 'alerts',
  description: 'alerts description',
};

const mockSolutionSideNav = jest.fn((_: SolutionSideNavProps) => <></>);
jest.mock('@kbn/security-solution-side-nav', () => ({
  ...jest.requireActual('@kbn/security-solution-side-nav'),
  SolutionSideNav: (props: SolutionSideNavProps) => mockSolutionSideNav(props),
}));
jest.mock('../../../lib/kibana');

const mockUseRouteSpy = jest.fn(() => [{ pageName: SecurityPageName.alerts }]);
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

jest.mock('../../../links/links_hooks', () => ({
  ...jest.requireActual('../../../links/links_hooks'),
  useParentLinks: (id: string) => [{ id }],
}));

const mockUseNavLinks = jest.fn();
jest.mock('../../../links/nav_links', () => ({
  ...jest.requireActual('../../../links/nav_links'),
  useNavLinks: () => mockUseNavLinks(),
}));
jest.mock('../../links', () => ({
  useGetSecuritySolutionLinkProps:
    () =>
    ({ deepLinkId }: { deepLinkId: SecurityPageName }) => ({
      href: `/${deepLinkId}`,
    }),
}));

const mockUseShowTimeline = jest.fn((): [boolean] => [false]);
jest.mock('../../../utils/timeline/use_show_timeline', () => ({
  useShowTimeline: () => mockUseShowTimeline(),
}));
const mockUseIsPolicySettingsBarVisible = jest.fn((): boolean => false);
jest.mock('../../../../management/pages/policy/view/policy_hooks', () => ({
  useIsPolicySettingsBarVisible: () => mockUseIsPolicySettingsBarVisible(),
}));

const renderNav = () =>
  render(<SecuritySideNav />, {
    wrapper: TestProviders,
  });

describe('SecuritySideNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavLinks.mockReturnValue([alertsNavLink, settingsNavLink]);
    useKibana().services.chrome.hasHeaderBanner$ = jest.fn(() =>
      new BehaviorSubject(false).asObservable()
    );
  });

  it('should render main items', () => {
    mockUseNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith({
      selectedId: SecurityPageName.alerts,
      items: [
        {
          id: SecurityPageName.alerts,
          label: 'alerts',
          href: '/alerts',
          position: 'top',
        },
      ],
      categories: getNavCategories(),
      tracker: track,
    });
  });

  it('should render the loader if items are still empty', () => {
    mockUseNavLinks.mockReturnValue([]);
    const result = renderNav();
    expect(result.getByTestId('sideNavLoader')).toBeInTheDocument();
    expect(mockSolutionSideNav).not.toHaveBeenCalled();
  });

  it('should render with selected id', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.administration }]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.administration,
      })
    );
  });

  it('should render footer items', () => {
    mockUseNavLinks.mockReturnValue([settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          {
            id: SecurityPageName.administration,
            label: 'Settings',
            href: '/administration',
            categories: settingsNavLink.categories,
            position: 'bottom',
            items: [
              {
                id: SecurityPageName.endpoints,
                label: 'title 2',
                href: '/endpoints',
                isBeta: true,
              },
            ],
          },
        ],
      })
    );
  });

  it('should not render disabled items', () => {
    mockUseNavLinks.mockReturnValue([{ ...alertsNavLink, disabled: true }, settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: SecurityPageName.administration,
          }),
        ],
      })
    );
  });

  describe('Launchpad', () => {
    it('should render Launchpad as a parent link with children', () => {
      const launchpadLink: NavigationLink = {
        id: SecurityPageName.launchpad,
        title: 'Launchpad',
        links: [
          {
            id: SecurityPageName.landing,
            title: 'Get started',
            sideNavIcon: 'launch',
          },
          {
            id: SecurityPageName.siemReadiness,
            title: 'SIEM Readiness',
            sideNavIcon: 'check',
          },
          {
            id: SecurityPageName.aiValue,
            title: 'Value report',
            sideNavIcon: 'stats',
          },
        ],
      };

      mockUseNavLinks.mockReturnValue([launchpadLink]);
      renderNav();

      const callArgs = mockSolutionSideNav.mock.calls[0][0];
      const launchpadItem = callArgs.items.find(
        (item: { id: string }) => item.id === SecurityPageName.launchpad
      );

      expect(launchpadItem).toBeDefined();
      expect(launchpadItem).toMatchObject({
        id: SecurityPageName.launchpad,
        label: 'Launchpad',
        position: 'bottom',
        items: expect.arrayContaining([
          expect.objectContaining({
            id: SecurityPageName.landing,
            label: 'Get started',
          }),
          expect.objectContaining({
            id: SecurityPageName.siemReadiness,
            label: 'SIEM Readiness',
            iconType: 'check',
          }),
          expect.objectContaining({
            id: SecurityPageName.aiValue,
            label: 'Value report',
            iconType: 'stats',
          }),
        ]),
      });
    });

    it('should position Launchpad above Manage', () => {
      const launchpadLink: NavigationLink = {
        id: SecurityPageName.launchpad,
        title: 'Launchpad',
        links: [],
      };

      mockUseNavLinks.mockReturnValue([alertsNavLink, launchpadLink, settingsNavLink]);
      renderNav();

      const callArgs = mockSolutionSideNav.mock.calls[0][0];
      const items = callArgs.items;

      const launchpadIndex = items.findIndex(
        (item: { id: string }) => item.id === SecurityPageName.launchpad
      );
      const manageIndex = items.findIndex(
        (item: { id: string }) => item.id === SecurityPageName.administration
      );

      expect(launchpadIndex).toBeGreaterThan(-1);
      expect(manageIndex).toBeGreaterThan(-1);
      expect(launchpadIndex).toBeLessThan(manageIndex);
    });

    it('should exclude disabled Launchpad children', () => {
      const launchpadLink: NavigationLink = {
        id: SecurityPageName.launchpad,
        title: 'Launchpad',
        links: [
          {
            id: SecurityPageName.landing,
            title: 'Get started',
          },
          {
            id: SecurityPageName.siemReadiness,
            title: 'SIEM Readiness',
            disabled: true,
          },
        ],
      };

      mockUseNavLinks.mockReturnValue([launchpadLink]);
      renderNav();

      const callArgs = mockSolutionSideNav.mock.calls[0][0];
      const launchpadItem = callArgs.items.find(
        (item: { id: string }) => item.id === SecurityPageName.launchpad
      );

      expect(launchpadItem?.items).toHaveLength(1);
      expect(launchpadItem?.items?.[0]?.id).toBe(SecurityPageName.landing);
    });
  });

  describe('panelTopOffset', () => {
    it('should render with top offset when chrome header banner is present', () => {
      useKibana().services.chrome.hasHeaderBanner$ = jest.fn(() =>
        new BehaviorSubject(true).asObservable()
      );
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelTopOffset: `calc(${EUI_HEADER_HEIGHT} + 32px)`,
        })
      );
    });

    it('should render without top offset when chrome header banner is not present', () => {
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelTopOffset: undefined,
        })
      );
    });
  });

  describe('panelBottomOffset', () => {
    it('should render with bottom offset when timeline bar visible', () => {
      mockUseIsPolicySettingsBarVisible.mockReturnValue(false);
      mockUseShowTimeline.mockReturnValue([true]);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelBottomOffset: BOTTOM_BAR_HEIGHT,
        })
      );
    });

    it('should render with bottom offset when policy settings bar visible', () => {
      mockUseShowTimeline.mockReturnValue([false]);
      mockUseIsPolicySettingsBarVisible.mockReturnValue(true);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelBottomOffset: BOTTOM_BAR_HEIGHT,
        })
      );
    });

    it('should not render with bottom offset when not needed', () => {
      mockUseShowTimeline.mockReturnValue([false]);
      mockUseIsPolicySettingsBarVisible.mockReturnValue(false);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelBottomOffset: undefined,
        })
      );
    });
  });
});
