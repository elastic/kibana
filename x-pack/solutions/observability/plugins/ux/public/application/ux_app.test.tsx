/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UX_BREADCRUMBS, uxHomeBreadcrumbs, uxInventoryBreadcrumbs } from './ux_breadcrumbs';

describe('UX_BREADCRUMBS', () => {
  it('links no crumb, so the Chrome Next header has no back target to derive', () => {
    expect(UX_BREADCRUMBS.every((crumb) => crumb.href === undefined)).toBe(true);
  });

  it('ends on the overview crumb', () => {
    expect(UX_BREADCRUMBS.at(-1)?.text).toEqual('Overview');
  });
});

describe('uxInventoryBreadcrumbs', () => {
  it('is a single unlinked crumb so Chrome Next has no back target', () => {
    expect(uxInventoryBreadcrumbs()).toEqual([{ text: 'User Experience' }]);
  });

  it('links User Experience when on the fleet Errors tab', () => {
    expect(uxInventoryBreadcrumbs({ tab: 'errors', inventoryHref: '/app/ux' })).toEqual([
      { text: 'User Experience', href: '/app/ux' },
      { text: 'Errors' },
    ]);
  });
});

describe('uxHomeBreadcrumbs', () => {
  const hrefs = {
    inventoryHref: '/app/ux?rangeFrom=now-24h',
    overviewHref: '/app/ux/weather-demo-app?rangeFrom=now-24h',
  };

  it('links inventory so overview back goes to the app list', () => {
    const crumbs = uxHomeBreadcrumbs({
      tab: 'overview',
      serviceName: 'weather-demo-app',
      ...hrefs,
    });
    expect(crumbs.map((crumb) => crumb.text)).toEqual(['User Experience', 'weather-demo-app']);
    expect(crumbs[0].href).toBe(hrefs.inventoryHref);
    expect(crumbs[1].href).toBeUndefined();
  });

  it('links the app crumb on other tabs so back returns to overview', () => {
    const crumbs = uxHomeBreadcrumbs({
      tab: 'pages',
      serviceName: 'weather-demo-app',
      ...hrefs,
    });
    expect(crumbs.map((crumb) => ({ text: crumb.text, href: crumb.href }))).toEqual([
      { text: 'User Experience', href: hrefs.inventoryHref },
      { text: 'weather-demo-app', href: hrefs.overviewHref },
      { text: 'Pages', href: undefined },
    ]);
  });

  it('adds the report title on a template path', () => {
    const crumbs = uxHomeBreadcrumbs({
      tab: 'reports',
      templateId: 'scorecard',
      serviceName: 'weather-demo-app',
      ...hrefs,
    });
    expect(crumbs.map((crumb) => crumb.text)).toEqual([
      'User Experience',
      'weather-demo-app',
      'Reporting',
      'Weekly UX scorecard',
    ]);
    expect(crumbs[0].href).toBe(hrefs.inventoryHref);
    expect(crumbs[1].href).toBe(hrefs.overviewHref);
  });
});
