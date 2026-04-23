/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { SecurityPageName } from '../../../common/constants';
import { parseEntityResolutionFromUrlState } from '../../common/components/link_to/entity_resolution_query_params';
import {
  getAgentBuilderLastAgentIdForSecurityOpenChat,
  getSecurityEntityExploreNavigateTarget,
  getUserNameForUserDetailsUrl,
  isAgentBuilderSidebarOpen,
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
  navigateToSecurityEntityInApp,
} from './entity_explore_navigation';

const queryFromPath = (pathWithQuery: string): string | undefined => {
  const i = pathWithQuery.indexOf('?');
  return i === -1 ? undefined : pathWithQuery.slice(i + 1);
};

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

  describe('getSecurityEntityExploreNavigateTarget', () => {
    it('returns host path without a /hosts prefix (deeplink already targets hosts)', () => {
      const { deepLinkId, path } = getSecurityEntityExploreNavigateTarget({
        entity_type: 'host',
        entity_id: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
        entity_name: 'MacBookPro.localdomain',
      });
      expect(deepLinkId).toBe(SecurityPageName.hosts);
      expect(path).toBeDefined();
      expect(path!.startsWith('/name/MacBookPro.localdomain/events?')).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromPath(path!))).toEqual({
        entityId: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
      });
    });

    it('returns users events path without a /users prefix', () => {
      const entityId = 'user:yuliianaumenko@B377958D-B4A8-5FCA-B237-F2DE40404617@local';
      const { deepLinkId, path } = getSecurityEntityExploreNavigateTarget({
        entity_type: 'user',
        entity_id: entityId,
        entity_name: 'yuliianaumenko@MacBookPro.localdomain',
      });
      expect(deepLinkId).toBe(SecurityPageName.users);
      expect(path).toBeDefined();
      expect(path!.startsWith('/name/yuliianaumenko%40MacBookPro.localdomain/events?')).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromPath(path!))).toEqual({
        entityId,
      });
    });

    it('returns entity analytics home without a redundant path (deep link already defines the base URL)', () => {
      const { deepLinkId, path } = getSecurityEntityExploreNavigateTarget({
        entity_type: 'service',
        entity_id: 'service:abc-123',
        entity_name: 'api.example',
      });
      expect(deepLinkId).toBe(SecurityPageName.entityAnalyticsHomePage);
      expect(path).toBeUndefined();
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

    const hostRow = {
      entity_type: 'host',
      entity_id: 'host:1',
      entity_name: 'host-1',
    };

    describe('navigateToSecurityEntityInApp', () => {
      it('clears the search session before navigateToApp is called', () => {
        const application = buildApplicationMock();
        const searchSession = buildSearchSessionMock();

        navigateToSecurityEntityInApp({
          application,
          appId: 'securitySolutionUI',
          row: hostRow,
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
          navigateToSecurityEntityInApp({
            application,
            appId: 'securitySolutionUI',
            row: hostRow,
          })
        ).not.toThrow();
        expect(application.navigateToApp).toHaveBeenCalledTimes(1);
      });
    });

    describe('navigateToEntityAnalyticsWithFlyoutInApp', () => {
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
