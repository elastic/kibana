/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationTree, filterForFeatureAvailability } from './navigation_tree';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import type { GroupDefinition, AppDeepLinkId } from '@kbn/core-chrome-browser';

describe('Navigation Tree', () => {
  it('should generate tree with overview', () => {
    const navigation = createNavigationTree({});
    const { body } = navigation;
    expect(body.length).toBeGreaterThan(0);
    const firstNavGroup = body[0] as GroupDefinition<AppDeepLinkId, string, string>;
    expect(firstNavGroup.children[0]).toMatchObject({
      title: 'Observability',
      link: 'observability-overview',
    });
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

  describe('filterForFeatureAvailability', () => {
    it('should return empty array if feature flag is false', () => {
      const node = {
        title: 'Test',
        link: 'test',
      };
      expect(filterForFeatureAvailability(node as NodeDefinition, false)).toEqual([]);
    });

    it('should return node in array if feature flag is true', () => {
      const node = {
        title: 'Test',
        link: 'test',
      };
      expect(filterForFeatureAvailability(node as NodeDefinition, true)).toEqual([node]);
    });
  });
});
