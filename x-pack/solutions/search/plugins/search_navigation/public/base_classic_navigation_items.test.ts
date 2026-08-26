/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseClassicNavItems } from './base_classic_navigation_items';

describe('BaseClassicNavItems', () => {
  it('includes the context engine nav item under Build', () => {
    const buildSection = BaseClassicNavItems.find((item) => item.id === 'build');

    expect(buildSection?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'context_engine',
          'data-test-subj': 'searchSideNav-Context',
          deepLink: {
            link: 'context_engine',
            shouldShowActiveForSubroutes: true,
          },
        }),
      ])
    );
  });
});
