/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { applyOriginSearchToParentLink } from './apply_origin_search_to_parent_link';

describe('applyOriginSearchToParentLink', () => {
  const navigateToApp = jest.fn();
  const baseLink = {
    href: '/s/obs/app/metrics/hosts',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    navigateToApp.mockReset();
  });

  it('appends a query string that already includes ?', () => {
    const result = applyOriginSearchToParentLink({
      link: baseLink,
      originAppId: 'metrics',
      originPathname: '/hosts',
      originSearch: '?_a=(filters:!())',
      navigateToApp,
    });

    expect(result.href).toBe('/s/obs/app/metrics/hosts?_a=(filters:!())');
  });

  it('prefixes ? when the origin search omits it', () => {
    const result = applyOriginSearchToParentLink({
      link: {
        href: '/s/obs/app/metrics/explorer',
        onClick: jest.fn(),
      },
      originAppId: 'metrics',
      originPathname: '/explorer',
      originSearch: '_a=(options:(groupBy:!(host.name)))',
      navigateToApp,
    });

    expect(result.href).toBe('/s/obs/app/metrics/explorer?_a=(options:(groupBy:!(host.name)))');
  });

  it('navigates with pathname + search on click', () => {
    const result = applyOriginSearchToParentLink({
      link: baseLink,
      originAppId: 'metrics',
      originPathname: '/hosts',
      originSearch: '?_a=(query:(query:host))',
      navigateToApp,
    });

    // Intentional `as MouseEvent` type assertion as the click handler only reads modifier flags from the DOM event boundary;
    const event = {
      defaultPrevented: false,
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: jest.fn(),
    } as unknown as MouseEvent;

    result.onClick?.(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(navigateToApp).toHaveBeenCalledWith('metrics', {
      path: '/hosts?_a=(query:(query:host))',
      replace: true,
    });
  });
});
