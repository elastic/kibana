/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertMatchesApp, budgetMatchesApp } from './extra_panel_scope';

describe('extra dashboard panel scope', () => {
  it('keeps unscoped budgets and those for the selected app', () => {
    expect(
      budgetMatchesApp(
        { filter: 'event.name: browser.web_vital', name: 'LCP', groupings: {} },
        'shop'
      )
    ).toBe(true);
    expect(
      budgetMatchesApp(
        {
          filter: 'resource.attributes.service.name: "shop"',
          name: 'LCP — shop',
          groupings: {},
        },
        'shop'
      )
    ).toBe(true);
    expect(
      budgetMatchesApp(
        {
          filter: 'resource.attributes.service.name: "checkout"',
          name: 'LCP — checkout',
          groupings: {},
        },
        'shop'
      )
    ).toBe(false);
  });

  it('keeps unscoped alerts and those tagged for the selected app', () => {
    expect(alertMatchesApp({}, 'shop')).toBe(true);
    expect(alertMatchesApp({ serviceName: 'shop' }, 'shop')).toBe(true);
    expect(alertMatchesApp({ serviceName: 'checkout' }, 'shop')).toBe(false);
  });
});
