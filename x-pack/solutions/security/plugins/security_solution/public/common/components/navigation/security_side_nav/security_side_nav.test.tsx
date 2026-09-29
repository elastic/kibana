/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { AGENT_BUILDER_NAV_AT_TOP_FLAG } from '@kbn/navigation-plugin/public';
import { render } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { SecurityPageName } from '../../../../app/types';
import type { createMockStore } from '../../../mock/create_store';
import { TestProviders } from '../../../mock';
import { BOTTOM_BAR_HEIGHT, EUI_HEADER_HEIGHT, SecuritySideNav } from './security_side_nav';
import type { SolutionSideNavProps } from '@kbn/security-solution-side-nav';
import type { NavigationLink } from '../../../links/types';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { getNavCategories } from './categories';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { SecurityGroupName } from '@kbn/security-solution-navigation';

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

const launchpadNavLink: NavigationLink = {
  id: SecurityPageName.launchpad,
  title: 'Launchpad',
  description: 'Launchpad',
  categories: [{ label: 'Launchpad category', linkIds: [] }],
  links: [
    {
      id: SecurityPageName.landing,
      title: 'Get started',
    },
    {
      id: SecurityPageName.siemReadiness,
      title: 'SIEM Readiness',
    },
  ],
};

const alertsNavLink: NavigationLink = {
  id: SecurityPageName.alerts,
  title: 'alerts',
  description: 'alerts description',
};

const mockSolutionSideNav = vi.fn((_: SolutionSideNavProps) => <></>);
vi.mock('@kbn/security-solution-side-nav', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/security-solution-side-nav')),
    SolutionSideNav: (props: SolutionSideNavProps) => mockSolutionSideNav(props),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../lib/kibana');

const mockUseRouteSpy = vi.fn(() => [{ pageName: SecurityPageName.alerts }]);
vi.mock('../../../utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: () => mockUseRouteSpy(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../links/links_hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../links/links_hooks')),
    useParentLinks: (id: string) => [{ id }],
  };
  return { ...mocked, default: mocked };
});

const mockUseNavLinks = vi.fn();
vi.mock('../../../links/nav_links', async () => {
  const mocked = {
    ...(await vi.importActual('../../../links/nav_links')),
    useNavLinks: () => mockUseNavLinks(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../links', () => {
  const mocked = {
    useGetSecuritySolutionLinkProps:
      () =>
      ({ deepLinkId }: { deepLinkId: SecurityPageName }) => ({
        href: `/${deepLinkId}`,
      }),
  };
  return { ...mocked, default: mocked };
});

const mockUseShowTimeline = vi.fn((): [boolean] => [false]);
vi.mock('../../../utils/timeline/use_show_timeline', () => {
  const mocked = {
    useShowTimeline: () => mockUseShowTimeline(),
  };
  return { ...mocked, default: mocked };
});
const mockUseIsPolicySettingsBarVisible = vi.fn((): boolean => false);
vi.mock('../../../../management/pages/policy/view/policy_hooks', () => {
  const mocked = {
    useIsPolicySettingsBarVisible: () => mockUseIsPolicySettingsBarVisible(),
  };
  return { ...mocked, default: mocked };
});

const renderNav = (options?: { store?: ReturnType<typeof createMockStore> }) =>
  render(<SecuritySideNav />, {
    wrapper: ({ children }) => <TestProviders store={options?.store}>{children}</TestProviders>,
  });

describe('SecuritySideNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavLinks.mockReturnValue([alertsNavLink, settingsNavLink]);
    useKibana().services.chrome.hasHeaderBanner$ = vi.fn(() =>
      new BehaviorSubject(false).asObservable()
    );
    useKibana().services.serverless = undefined;
  });

  it('should render main items with external links', () => {
    mockUseNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
        items: [
          expect.objectContaining({
            id: SecurityPageName.externalLinkDiscover,
          }),
          expect.objectContaining({
            id: SecurityPageName.externalLinkWorkflows,
            label: 'Workflows',
            position: 'top',
          }),
          expect.objectContaining({
            href: '/alerts',
            id: SecurityPageName.alerts,
            label: 'alerts',
            position: 'top',
          }),
        ],
        categories: getNavCategories(AIChatExperience.Classic, false, false),
        tracker: track,
      })
    );
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
        items: expect.arrayContaining([
          expect.objectContaining({
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
          }),
        ]),
      })
    );
  });

  it('should not render disabled items', () => {
    mockUseNavLinks.mockReturnValue([{ ...alertsNavLink, disabled: true }, settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: SecurityPageName.administration,
          }),
        ]),
      })
    );
  });

  it('should render launchpad item in footer', () => {
    mockUseNavLinks.mockReturnValue([alertsNavLink, launchpadNavLink, settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: SecurityGroupName.launchpad,
            position: 'bottom',
          }),
        ]),
      })
    );
  });

  it('should place administration item in footer', () => {
    mockUseNavLinks.mockReturnValue([alertsNavLink, launchpadNavLink, settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: SecurityPageName.administration,
            position: 'bottom',
          }),
        ]),
      })
    );
  });

  it('should not include administration item in body', () => {
    mockUseNavLinks.mockReturnValue([settingsNavLink, alertsNavLink]);
    renderNav();
    const calls = mockSolutionSideNav.mock.calls;
    const lastCall = calls[calls.length - 1];
    const items = lastCall[0].items;
    const administrationItemsInBody = items.filter(
      (item) => item.id === SecurityPageName.administration && item.position !== 'bottom'
    );
    expect(administrationItemsInBody).toHaveLength(0);
  });

  it('should select launchpad when landing page is selected', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.landing }]);
    const landingNavLink: NavigationLink = {
      id: SecurityPageName.landing,
      title: 'Get started',
      description: 'Get started description',
    };
    mockUseNavLinks.mockReturnValue([alertsNavLink, landingNavLink, settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: 'securityGroup:launchpad',
      })
    );
  });

  it('should maintain top position for most items', () => {
    mockUseNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: SecurityPageName.alerts,
            position: 'top',
          }),
        ]),
      })
    );
  });

  describe('panelTopOffset', () => {
    it('should render with top offset when chrome header banner is present', () => {
      useKibana().services.chrome.hasHeaderBanner$ = vi.fn(() =>
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

  describe('enableAlertsAndAttacksAlignment setting', () => {
    it('should call getNavCategories with true when setting is enabled', () => {
      useKibana().services.uiSettings.get = vi.fn().mockReturnValue(true);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: getNavCategories(AIChatExperience.Classic, true, false),
        })
      );
    });

    it('should call getNavCategories with false when setting is disabled', () => {
      useKibana().services.uiSettings.get = vi.fn().mockReturnValue(false);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: getNavCategories(AIChatExperience.Classic, false, false),
        })
      );
    });
  });

  it('should render agentBuilder external link when chat experience is Agent', () => {
    (useKibana().services.settings.client.get$ as Mock).mockImplementation(() =>
      new BehaviorSubject(AIChatExperience.Agent).asObservable()
    );
    mockUseNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: SecurityPageName.externalLinkDiscover,
          }),
          expect.objectContaining({
            id: SecurityPageName.externalLinkWorkflows,
            label: 'Workflows',
            position: 'top',
          }),
          expect.objectContaining({
            href: '/alerts',
            id: SecurityPageName.alerts,
            label: 'alerts',
            position: 'top',
          }),
        ],
        categories: getNavCategories(AIChatExperience.Classic, false, false),
      })
    );
  });

  it('should render agentBuilder external link at top when chat experience is Agent and isAgentBuilderNavAtTop is true', () => {
    (useKibana().services.settings.client.get$ as Mock).mockImplementation(() =>
      new BehaviorSubject(AIChatExperience.Agent).asObservable()
    );
    (useKibana().services.featureFlags.useBooleanValue as Mock).mockImplementation(
      (flag: string) => flag === AGENT_BUILDER_NAV_AT_TOP_FLAG
    );
    mockUseNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
        items: [
          expect.objectContaining({
            id: SecurityPageName.externalLinkAgentBuilder,
            label: 'Agents',
            position: 'top',
          }),
          expect.objectContaining({
            id: SecurityPageName.externalLinkDiscover,
            label: 'Discover',
            position: 'top',
          }),
          expect.objectContaining({
            id: SecurityPageName.externalLinkWorkflows,
            label: 'Workflows',
            position: 'top',
          }),
          expect.objectContaining({
            href: '/alerts',
            id: SecurityPageName.alerts,
            label: 'alerts',
            position: 'top',
          }),
        ],
        categories: getNavCategories(AIChatExperience.Agent, false, true),
      })
    );
  });

  it('should build external links using `getUrlForApp` so basePath and space are applied', () => {
    (useKibana().services.application.getUrlForApp as Mock).mockImplementation(
      (appId: string, options?: { path?: string }) =>
        `/test-basepath/s/my-space/app/${appId}${options?.path ?? ''}`
    );
    (useKibana().services.settings.client.get$ as Mock).mockImplementation(() =>
      new BehaviorSubject(AIChatExperience.Agent).asObservable()
    );
    mockUseNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();

    expect(useKibana().services.application.getUrlForApp as Mock).toHaveBeenCalledWith(
      'agent_builder',
      {
        path: '/agents',
      }
    );
    expect(useKibana().services.application.getUrlForApp as Mock).toHaveBeenCalledWith('discover');
    expect(useKibana().services.application.getUrlForApp as Mock).toHaveBeenCalledWith('workflows');

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: SecurityPageName.externalLinkAgentBuilder,
            href: '/test-basepath/s/my-space/app/agent_builder/agents',
          }),
          expect.objectContaining({
            id: SecurityPageName.externalLinkDiscover,
            href: '/test-basepath/s/my-space/app/discover',
          }),
          expect.objectContaining({
            id: SecurityPageName.externalLinkWorkflows,
            href: '/test-basepath/s/my-space/app/workflows',
          }),
        ]),
      })
    );
  });
});
