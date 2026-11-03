/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationsForFilter } from './applications_for_filter';

describe('applicationsForFilter', () => {
  const kibanaPr = { name: 'kibana-pr-284540', platform: 'web' as const };

  it('keeps a selected app that is missing from the page-load list', () => {
    expect(applicationsForFilter([kibanaPr], 'acme-ecommerce')).toEqual([
      { name: 'acme-ecommerce', platform: 'web' },
      kibanaPr,
    ]);
  });

  it('does not duplicate when the selected app is already in the list', () => {
    const acme = { name: 'acme-ecommerce', platform: 'web' as const };
    expect(applicationsForFilter([acme, kibanaPr], 'acme-ecommerce')).toEqual([acme, kibanaPr]);
  });

  it('returns an empty list when nothing is selected', () => {
    expect(applicationsForFilter(undefined, undefined)).toEqual([]);
  });
});
