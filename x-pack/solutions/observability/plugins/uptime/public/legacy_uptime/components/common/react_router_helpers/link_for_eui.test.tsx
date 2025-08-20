/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import '../../../lib/__mocks__/ut_router_history.mock';

import { ReactRouterEuiLink } from './link_for_eui';
import { mockHistory } from '../../../lib/__mocks__/ut_router_history.mock';

describe('EUI & React Router Component Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const { getByRole } = render(<ReactRouterEuiLink to="/" />);
    expect(getByRole('link')).toBeInTheDocument();
  });

  it('passes down all ...rest props', () => {
    const { getByRole } = render(
      <ReactRouterEuiLink to="/" data-test-subj="foo" external={true} />
    );
    const link = getByRole('link');

    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.getAttribute('data-test-subj')).toBe('foo');

    const popoutElement = getByRole('presentation');
    expect(popoutElement.getAttribute('data-euiicon-type')).toBe('popout');
  });

  it('renders with the correct href and onClick props', () => {
    const { getByRole } = render(<ReactRouterEuiLink to="/foo/bar" />);
    const link = getByRole('link');

    expect(link.onclick).toBeInstanceOf(Function);
    expect(link.getAttribute('href')).toBe('/enterprise_search/foo/bar');
    expect(mockHistory.createHref).toHaveBeenCalled();
  });

  describe('onClick', () => {
    it('prevents default navigation and uses React Router history', () => {
      const { getByRole } = render(<ReactRouterEuiLink to="/bar/baz" />);
      const link = getByRole('link');

      // Fire a simulated click
      // Spy on the real preventDefault method
      const preventDefaultSpy = jest.spyOn(Event.prototype, 'preventDefault');

      fireEvent.click(link);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockHistory.push).toHaveBeenCalledWith('/bar/baz');

      // Clean up spy
      preventDefaultSpy.mockRestore();
    });

    it('does not prevent default browser behavior on new tab/window clicks', () => {
      const { getByRole } = render(<ReactRouterEuiLink to="/bar/baz" />);
      const link = getByRole('link');

      // Case 1: Test shift-click (opens in new window)
      fireEvent.click(link, {
        shiftKey: true,
      });

      // Case 2: Test clicking a link with target="_blank"
      // First, modify the link to have target="_blank"
      link.setAttribute('target', '_blank');
      fireEvent.click(link);

      // Verify history.push was not called in either case
      expect(mockHistory.push).not.toHaveBeenCalled();
    });
  });
});
