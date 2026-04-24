/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  describe('search session clearing on cross-app navigation', () => {
    const buildApplicationMock = (): jest.Mocked<ApplicationStart> =>
      ({
        navigateToApp: jest.fn(),
      } as unknown as jest.Mocked<ApplicationStart>);

    const buildSearchSessionMock = (): jest.Mocked<Pick<ISessionService, 'clear'>> => ({
      clear: jest.fn(),
    });

    describe('navigateToEntityAnalyticsWithFlyoutInApp', () => {
      it('preserves current entity analytics query state and appends flyout', () => {
        const application = buildApplicationMock();
        const risonQuery = '(pageIndex:3,sort:!((@timestamp,desc)))';

        window.history.replaceState(
          {},
          '',
          `/app/security/entity_analytics_home_page?cspq=${encodeURIComponent(
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

      it('clears the search session before navigateToApp is called', () => {
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
    });

    describe('navigateToEntityAnalyticsHomePageInApp', () => {
      it('clears the search session before navigateToApp is called', () => {
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
    });
  });
});
