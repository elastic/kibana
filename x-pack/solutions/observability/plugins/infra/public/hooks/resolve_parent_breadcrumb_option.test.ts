/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveParentBreadcrumbOption } from './resolve_parent_breadcrumb_option';

describe('resolveParentBreadcrumbOption', () => {
  const inventory = { text: 'Infrastructure inventory', link: { href: '/inventory' } };
  const hosts = { text: 'Hosts', link: { href: '/hosts' } };
  const explorer = { text: 'Metrics Explorer', link: { href: '/explorer' } };
  const breadcrumbMap = new Map([
    ['/inventory', inventory],
    ['/hosts', hosts],
    ['/explorer', explorer],
  ]);

  it('returns the Inventory default when no origin pathname is present', () => {
    expect(
      resolveParentBreadcrumbOption({
        breadcrumbMap,
        defaultOption: inventory,
      })
    ).toBe(inventory);
  });

  it('returns the Inventory default for an unknown origin pathname', () => {
    expect(
      resolveParentBreadcrumbOption({
        originPathname: '/unknown',
        breadcrumbMap,
        defaultOption: inventory,
      })
    ).toBe(inventory);
  });

  it('returns Hosts when the origin pathname is /hosts', () => {
    expect(
      resolveParentBreadcrumbOption({
        originPathname: '/hosts',
        breadcrumbMap,
        defaultOption: inventory,
      })
    ).toBe(hosts);
  });

  it('returns Metrics Explorer when the origin pathname is /explorer', () => {
    expect(
      resolveParentBreadcrumbOption({
        originPathname: '/explorer',
        breadcrumbMap,
        defaultOption: inventory,
      })
    ).toBe(explorer);
  });

  it('returns Inventory when the origin pathname is /inventory', () => {
    expect(
      resolveParentBreadcrumbOption({
        originPathname: '/inventory',
        breadcrumbMap,
        defaultOption: inventory,
      })
    ).toBe(inventory);
  });
});
