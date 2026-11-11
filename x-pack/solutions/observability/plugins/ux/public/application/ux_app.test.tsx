/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UX_BREADCRUMBS } from './ux_app';

describe('UX_BREADCRUMBS', () => {
  it('links no crumb, so the Chrome Next header has no back target to derive', () => {
    expect(UX_BREADCRUMBS.every((crumb) => crumb.href === undefined)).toBe(true);
  });

  it('ends on the dashboard crumb', () => {
    expect(UX_BREADCRUMBS.at(-1)?.text).toEqual('Dashboard');
  });
});
