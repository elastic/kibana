/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationTree } from './navigation_tree';
import type { GroupDefinition, AppDeepLinkId } from '@kbn/core-chrome-browser';

describe('Navigation Tree', () => {
  it('should generate tree with overview', () => {
    const navigation = createNavigationTree({});
    expect((navigation.body[0] as GroupDefinition<AppDeepLinkId, string, string>).children).toEqual(
      expect.arrayContaining([
        {
          title: 'Overview',
          link: 'observability-overview',
        },
      ])
    );
  });
  it('should not generate tree with overview', () => {
    const navigation = createNavigationTree({ overviewAvailable: false });
    expect(
      (navigation.body[0] as GroupDefinition<AppDeepLinkId, string, string>).children
    ).not.toEqual(
      expect.arrayContaining([
        {
          title: 'Overview',
          link: 'observability-overview',
        },
      ])
    );
  });
});
