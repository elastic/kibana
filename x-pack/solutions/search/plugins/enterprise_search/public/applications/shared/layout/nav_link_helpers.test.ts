/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../__mocks__/kea_logic';
import '../../__mocks__/react_router';

jest.mock('../react_router_helpers/link_events', () => ({
  letBrowserHandleEvent: jest.fn(),
}));

import { letBrowserHandleEvent } from '../react_router_helpers/link_events';

import { generateNavLink, getNavLinkActive } from './nav_link_helpers';

describe('generateNavLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.history.location.pathname = '/';
  });

  it('generates React Router props for use within an EuiSideNavItem obj', () => {
    (letBrowserHandleEvent as jest.Mock).mockReturnValueOnce(false);

    const navItem = generateNavLink({ to: '/test' });

    expect(navItem).toEqual({
      href: '/app/enterprise_search/test',
      onClick: expect.any(Function),
      isSelected: false,
    });

    navItem.onClick({ preventDefault: jest.fn() } as any);
    expect(mockKibanaValues.navigateToUrl).toHaveBeenCalledWith('/test', {
      shouldNotCreateHref: false,
      shouldNotPrepend: false,
    });
  });

  describe('isSelected / getNavLinkActive', () => {
    it('returns true when the current path matches the link path', () => {
      mockKibanaValues.history.location.pathname = '/test';
      const isSelected = getNavLinkActive({ to: '/test' });

      expect(isSelected).toEqual(true);
    });

    it('return false when the current path does not match the link path', () => {
      mockKibanaValues.history.location.pathname = '/hello';
      const isSelected = getNavLinkActive({ to: '/world' });

      expect(isSelected).toEqual(false);
    });

    it('returns true when to includes a basePath and shouldNotCreateHref=true', () => {
      mockKibanaValues.history.location.pathname = '/test';
      const isSelected = getNavLinkActive({
        shouldNotCreateHref: true,
        to: '/app/enterprise_search/test',
      });

      expect(isSelected).toEqual(true);
    });

    describe('shouldShowActiveForSubroutes', () => {
      it('returns true if the current path is a subroute of the passed path', () => {
        mockKibanaValues.history.location.pathname = '/hello/world';
        const isSelected = getNavLinkActive({ shouldShowActiveForSubroutes: true, to: '/hello' });

        expect(isSelected).toEqual(true);
      });

      /* NOTE: This logic is primarily used for the following routing scenario:
       * 1. /item/{itemId} shows a child subnav, e.g. /items/{itemId}/settings
       *    - BUT when the child subnav is open, the parent `Item` nav link should not show as active - its child nav links should
       * 2. /item/create_item (example) does *not* show a child subnav
       *    - BUT the parent `Item` nav link should highlight when on this non-subnav route
       */
      it('returns false if subroutes already have their own items subnav (with active state)', () => {
        mockKibanaValues.history.location.pathname = '/items/123/settings';
        const isSelected = getNavLinkActive({
          items: [{ id: 'settings', name: 'Settings' }],
          shouldShowActiveForSubroutes: true,
          to: '/items',
        });

        expect(isSelected).toEqual(false);
      });

      it('returns false if not a valid subroute', () => {
        mockKibanaValues.history.location.pathname = '/hello/world';
        const isSelected = getNavLinkActive({ shouldShowActiveForSubroutes: true, to: '/world' });

        expect(isSelected).toEqual(false);
      });

      it('returns false for subroutes if the flag is not passed', () => {
        mockKibanaValues.history.location.pathname = '/hello/world';
        const isSelected = getNavLinkActive({ to: '/hello' });

        expect(isSelected).toEqual(false);
      });

      it('returns true when to includes a basePath and shouldNotCreateHref=true', () => {
        mockKibanaValues.history.location.pathname = '/hello/world';
        const isSelected = getNavLinkActive({
          shouldNotCreateHref: true,
          shouldShowActiveForSubroutes: true,
          to: '/app/enterprise_search/hello',
        });

        expect(isSelected).toEqual(true);
      });
    });
  });

  it('optionally passes items', () => {
    const navItem = generateNavLink({ items: [], to: '/test' });

    expect(navItem.items).toEqual([]);
  });
});
