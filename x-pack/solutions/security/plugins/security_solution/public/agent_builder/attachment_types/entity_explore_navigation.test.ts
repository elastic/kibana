/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  getAgentBuilderLastAgentIdForSecurityOpenChat,
  getHostNameForHostDetailsUrl,
  getServiceNameForServiceDetailsUrl,
  getUserNameForUserDetailsUrl,
  isAgentBuilderSidebarOpen,
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
} from './entity_explore_navigation';

describe('entity_explore_navigation', () => {
  describe('isAgentBuilderSidebarOpen', () => {
    it('is true when chrome reports the agentBuilder sidebar app', () => {
      expect(
        isAgentBuilderSidebarOpen({
          sidebar: { getCurrentAppId: () => 'agentBuilder' },
        } as never)
      ).toBe(true);
    });

    it('is false when another sidebar app is active', () => {
      expect(
        isAgentBuilderSidebarOpen({
          sidebar: { getCurrentAppId: () => null },
        } as never)
      ).toBe(false);
    });

    it('is false when chrome is undefined', () => {
      expect(isAgentBuilderSidebarOpen(undefined)).toBe(false);
    });
  });

  describe('getAgentBuilderLastAgentIdForSecurityOpenChat', () => {
    beforeEach(() => {
      window.localStorage.removeItem('agentBuilder.agentId');
    });

    it('returns platform default when localStorage is empty', () => {
      expect(getAgentBuilderLastAgentIdForSecurityOpenChat()).toBe(agentBuilderDefaultAgentId);
    });

    it('parses JSON-encoded agent id from localStorage (same format as Agent Builder)', () => {
      window.localStorage.setItem('agentBuilder.agentId', '"my-agent-id"');
      expect(getAgentBuilderLastAgentIdForSecurityOpenChat()).toBe('my-agent-id');
    });
  });

  describe('getUserNameForUserDetailsUrl', () => {
    it('uses entity_name when it is a real user.name-style value', () => {
      expect(
        getUserNameForUserDetailsUrl({
          entity_type: 'user',
          entity_id: 'user:yuliianaumenko@B377958D-B4A8-5FCA-B237-F2DE40404617@local',
          entity_name: 'yuliianaumenko@MacBookPro.localdomain',
        })
      ).toBe('yuliianaumenko@MacBookPro.localdomain');
    });

    it('ignores placeholder entity_name "name" and builds user@host from EUID + source.host.name', () => {
      expect(
        getUserNameForUserDetailsUrl({
          entity_type: 'user',
          entity_id: 'user:yuliianaumenko@B377958D-B4A8-5FCA-B237-F2DE40404617@local',
          entity_name: 'name',
          source: { host: { name: 'MacBookPro.localdomain' } },
        })
      ).toBe('yuliianaumenko@MacBookPro.localdomain');
    });
  });

  describe('getHostNameForHostDetailsUrl', () => {
    it('uses entity_name when it is a real host.name-style value', () => {
      expect(
        getHostNameForHostDetailsUrl({
          entity_type: 'host',
          entity_id: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
          entity_name: 'MacBookPro.localdomain',
        })
      ).toBe('MacBookPro.localdomain');
    });

    it('falls back to entity_id when entity_name is the placeholder "name"', () => {
      expect(
        getHostNameForHostDetailsUrl({
          entity_type: 'host',
          entity_id: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
          entity_name: 'name',
        })
      ).toBe('host:B377958D-B4A8-5FCA-B237-F2DE40404617');
    });

    it('falls back to entity_id when entity_name is whitespace-wrapped placeholder " name "', () => {
      expect(
        getHostNameForHostDetailsUrl({
          entity_type: 'host',
          entity_id: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
          entity_name: ' name ',
        })
      ).toBe('host:B377958D-B4A8-5FCA-B237-F2DE40404617');
    });

    it('falls back to entity_id when entity_name is missing', () => {
      expect(
        getHostNameForHostDetailsUrl({
          entity_type: 'host',
          entity_id: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
        })
      ).toBe('host:B377958D-B4A8-5FCA-B237-F2DE40404617');
    });
  });

  describe('getServiceNameForServiceDetailsUrl', () => {
    it('uses entity_name when it is a real service.name-style value', () => {
      expect(
        getServiceNameForServiceDetailsUrl({
          entity_type: 'service',
          entity_id: 'service:abc-123',
          entity_name: 'api.example',
        })
      ).toBe('api.example');
    });

    it('falls back to entity_id when entity_name is the placeholder "name"', () => {
      expect(
        getServiceNameForServiceDetailsUrl({
          entity_type: 'service',
          entity_id: 'service:abc-123',
          entity_name: 'name',
        })
      ).toBe('service:abc-123');
    });

    it('falls back to entity_id when entity_name is whitespace-wrapped placeholder " name "', () => {
      expect(
        getServiceNameForServiceDetailsUrl({
          entity_type: 'service',
          entity_id: 'service:abc-123',
          entity_name: ' name ',
        })
      ).toBe('service:abc-123');
    });

    it('falls back to entity_id when entity_name is missing', () => {
      expect(
        getServiceNameForServiceDetailsUrl({
          entity_type: 'service',
          entity_id: 'service:abc-123',
        })
      ).toBe('service:abc-123');
    });
  });

  describe('navigation helpers', () => {
    const EA_HOME_PATH = '/app/security/entity_analytics_home_page';
    const OTHER_PATH = '/app/security/alerts';

    const buildApplicationMock = (): jest.Mocked<ApplicationStart> =>
      ({
        navigateToApp: jest.fn(),
      } as unknown as jest.Mocked<ApplicationStart>);

    const buildSearchSessionMock = (): jest.Mocked<Pick<ISessionService, 'clear'>> => ({
      clear: jest.fn(),
    });

    const buildChromeMock = (sidebarAppId: string | null = 'agentBuilder') =>
      ({
        sidebar: { getCurrentAppId: () => sidebarAppId },
      } as never);

    const buildAgentBuilderNavigationMock = (): jest.Mocked<
      Pick<AgentBuilderPluginStart, 'toggleChat' | 'openChat'>
    > => ({
      toggleChat: jest.fn(),
      openChat: jest.fn(),
    });

    beforeEach(() => {
      // Reset to a non-EA path so tests that set their own pathname don't bleed into each other.
      window.history.replaceState({}, '', OTHER_PATH);
    });

    describe('navigateToEntityAnalyticsWithFlyoutInApp', () => {
      it('preserves current entity analytics query state and appends flyout', () => {
        const application = buildApplicationMock();
        const risonQuery = '(pageIndex:3,sort:!((@timestamp,desc)))';

        window.history.replaceState(
          {},
          '',
          `${EA_HOME_PATH}?cspq=${encodeURIComponent(
            risonQuery
          )}&watchlistId=wl-123&watchlistName=VIPs&groupBy=resolution`
        );

        navigateToEntityAnalyticsWithFlyoutInApp({
          application,
          appId: 'securitySolutionUI',
          flyout: { right: { id: 'service-panel', params: { serviceName: 'svc-a' } } },
        });

        expect(application.navigateToApp).toHaveBeenCalledTimes(1);
        const [, options] = application.navigateToApp.mock.calls[0];
        const path = (options as { path?: string }).path ?? '';
        const params = new URLSearchParams(path.startsWith('?') ? path.slice(1) : path);

        expect(params.get('cspq')).toBe(risonQuery);
        expect(params.get('watchlistId')).toBe('wl-123');
        expect(params.get('watchlistName')).toBe('VIPs');
        expect(params.get('groupBy')).toBe('resolution');
        expect(params.get('flyout')).toContain('right');
      });

      it('clears the search session before navigateToApp is called (cross-app)', () => {
        const application = buildApplicationMock();
        const searchSession = buildSearchSessionMock();

        navigateToEntityAnalyticsWithFlyoutInApp({
          application,
          appId: 'securitySolutionUI',
          flyout: { left: { id: 'l' }, right: { id: 'r' }, preview: [] },
          searchSession: searchSession as unknown as ISessionService,
        });

        expect(searchSession.clear).toHaveBeenCalledTimes(1);
        expect(application.navigateToApp).toHaveBeenCalledTimes(1);
        const clearOrder = searchSession.clear.mock.invocationCallOrder[0];
        const navigateOrder = application.navigateToApp.mock.invocationCallOrder[0];
        expect(clearOrder).toBeLessThan(navigateOrder);
      });

      it('does not throw when searchSession is undefined (backward-compat)', () => {
        const application = buildApplicationMock();

        expect(() =>
          navigateToEntityAnalyticsWithFlyoutInApp({
            application,
            appId: 'securitySolutionUI',
            flyout: { left: { id: 'l' }, right: { id: 'r' }, preview: [] },
          })
        ).not.toThrow();
        expect(application.navigateToApp).toHaveBeenCalledTimes(1);
      });

      describe('when already on the EA home page', () => {
        beforeEach(() => {
          window.history.replaceState({}, '', EA_HOME_PATH);
        });

        it('still navigates to update the flyout URL param', () => {
          const application = buildApplicationMock();

          navigateToEntityAnalyticsWithFlyoutInApp({
            application,
            appId: 'securitySolutionUI',
            flyout: { right: { id: 'host-panel', params: { hostName: 'web-01' } } },
          });

          expect(application.navigateToApp).toHaveBeenCalledTimes(1);
        });

        it('does not close the sidebar', () => {
          const application = buildApplicationMock();
          const agentBuilder = buildAgentBuilderNavigationMock();

          navigateToEntityAnalyticsWithFlyoutInApp({
            application,
            appId: 'securitySolutionUI',
            flyout: { right: { id: 'host-panel', params: { hostName: 'web-01' } } },
            agentBuilder: agentBuilder as unknown as AgentBuilderPluginStart,
            chrome: buildChromeMock(),
          });

          expect(agentBuilder.toggleChat).not.toHaveBeenCalled();
        });

        it('does not clear the search session', () => {
          const application = buildApplicationMock();
          const searchSession = buildSearchSessionMock();

          navigateToEntityAnalyticsWithFlyoutInApp({
            application,
            appId: 'securitySolutionUI',
            flyout: { right: { id: 'host-panel', params: { hostName: 'web-01' } } },
            searchSession: searchSession as unknown as ISessionService,
          });

          expect(searchSession.clear).not.toHaveBeenCalled();
        });
      });
    });

    describe('navigateToEntityAnalyticsHomePageInApp', () => {
      it('clears the search session before navigateToApp is called (cross-app)', () => {
        const application = buildApplicationMock();
        const searchSession = buildSearchSessionMock();

        navigateToEntityAnalyticsHomePageInApp({
          application,
          appId: 'securitySolutionUI',
          searchSession: searchSession as unknown as ISessionService,
        });

        expect(searchSession.clear).toHaveBeenCalledTimes(1);
        expect(application.navigateToApp).toHaveBeenCalledTimes(1);
        const clearOrder = searchSession.clear.mock.invocationCallOrder[0];
        const navigateOrder = application.navigateToApp.mock.invocationCallOrder[0];
        expect(clearOrder).toBeLessThan(navigateOrder);
      });

      it('does not throw when searchSession is undefined (backward-compat)', () => {
        const application = buildApplicationMock();

        expect(() =>
          navigateToEntityAnalyticsHomePageInApp({
            application,
            appId: 'securitySolutionUI',
          })
        ).not.toThrow();
        expect(application.navigateToApp).toHaveBeenCalledTimes(1);
      });

      describe('fallback when openSidebarConversation is not provided', () => {
        const AGENT_BUILDER_AGENT_ID_KEY = 'agentBuilder.agentId';

        beforeEach(() => {
          window.localStorage.removeItem(AGENT_BUILDER_AGENT_ID_KEY);
        });

        afterEach(() => {
          jest.useRealTimers();
        });

        it('opens chat via agentBuilder.openChat with sessionTag: security and the stored agentId', () => {
          jest.useFakeTimers();
          const application = buildApplicationMock();
          const agentBuilder = buildAgentBuilderNavigationMock();
          const storedAgentId = 'my-agent';
          window.localStorage.setItem(AGENT_BUILDER_AGENT_ID_KEY, JSON.stringify(storedAgentId));

          navigateToEntityAnalyticsHomePageInApp({
            application,
            appId: 'securitySolutionUI',
            agentBuilder: agentBuilder as unknown as AgentBuilderPluginStart,
          });

          jest.runAllTimers();

          expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
          expect(agentBuilder.openChat).toHaveBeenCalledWith({
            sessionTag: 'security',
            newConversation: false,
            agentId: storedAgentId,
          });
        });
      });

      describe('when already on the EA home page', () => {
        beforeEach(() => {
          window.history.replaceState({}, '', EA_HOME_PATH);
        });

        it('skips navigation entirely when no watchlist params are needed', () => {
          const application = buildApplicationMock();

          navigateToEntityAnalyticsHomePageInApp({
            application,
            appId: 'securitySolutionUI',
          });

          expect(application.navigateToApp).not.toHaveBeenCalled();
        });

        it('does not close the sidebar when no watchlist params are needed', () => {
          const application = buildApplicationMock();
          const agentBuilder = buildAgentBuilderNavigationMock();

          navigateToEntityAnalyticsHomePageInApp({
            application,
            appId: 'securitySolutionUI',
            agentBuilder: agentBuilder as unknown as AgentBuilderPluginStart,
            chrome: buildChromeMock(),
          });

          expect(agentBuilder.toggleChat).not.toHaveBeenCalled();
        });

        it('still navigates when watchlist params are provided', () => {
          const application = buildApplicationMock();

          navigateToEntityAnalyticsHomePageInApp({
            application,
            appId: 'securitySolutionUI',
            watchlistId: 'wl-1',
            watchlistName: 'VIPs',
          });

          expect(application.navigateToApp).toHaveBeenCalledTimes(1);
          const [, options] = application.navigateToApp.mock.calls[0];
          expect((options as { path?: string }).path).toContain('watchlistId=wl-1');
        });

        it('does not close the sidebar even when navigating for watchlist params', () => {
          const application = buildApplicationMock();
          const agentBuilder = buildAgentBuilderNavigationMock();

          navigateToEntityAnalyticsHomePageInApp({
            application,
            appId: 'securitySolutionUI',
            watchlistId: 'wl-1',
            agentBuilder: agentBuilder as unknown as AgentBuilderPluginStart,
            chrome: buildChromeMock(),
          });

          expect(agentBuilder.toggleChat).not.toHaveBeenCalled();
        });
      });
    });
  });
});
