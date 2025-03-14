/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyAiSocNavigation, aiGroup } from './ai_soc_navigation';
import { alertSummaryLink } from './links';
import { ProductLine, ProductTier } from '../../../common/product';
import * as utils from './utils'; // We'll spy on the named export from here
import type { WritableDraft } from 'immer/dist/internal';
import type {
  AppDeepLinkId,
  GroupDefinition,
  NavigationTreeDefinition,
  NodeDefinition,
} from '@kbn/core-chrome-browser';

const nonAiProduct = { product_line: ProductLine.security, product_tier: ProductTier.essentials };
const aiProduct = { product_line: ProductLine.aiSoc, product_tier: ProductTier.essentials };

const getSampleDraft = (): WritableDraft<NavigationTreeDefinition<AppDeepLinkId>> => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_solution_nav',
      title: 'Security',
      icon: 'logoSecurity',
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: false,
      children: [
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'discover:',
              link: 'discover',
              title: 'Discover',
            },
            {
              id: 'dashboards',
              link: 'securitySolutionUI:dashboards',
              title: 'Dashboards',
              children: [
                {
                  id: 'overview',
                  link: 'securitySolutionUI:overview',
                  title: 'Overview',
                },
                {
                  id: 'detection_response',
                  link: 'securitySolutionUI:detection_response',
                  title: 'Detection & Response',
                },
                {
                  id: 'entity_analytics',
                  link: 'securitySolutionUI:entity_analytics',
                  title: 'Entity Analytics',
                },
                {
                  id: 'data_quality',
                  link: 'securitySolutionUI:data_quality',
                  title: 'Data Quality',
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
      ],
      isCollapsible: false,
    },
  ],
});

describe('applyAiSocNavigation', () => {
  let draft: WritableDraft<NavigationTreeDefinition<AppDeepLinkId>>;

  beforeEach(() => {
    draft = getSampleDraft();
  });

  describe('when productTypes does NOT include aiSoc', () => {
    it('should not modify the navigation tree', () => {
      const productTypes = [nonAiProduct];

      const originalDraft = JSON.parse(JSON.stringify(draft));
      applyAiSocNavigation(draft, productTypes);

      // Should remain unchanged
      expect(draft).toEqual(originalDraft);
    });
  });

  describe('when productTypes includes aiSoc', () => {
    let filterSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on filterFromWhitelist so we can control the filter result
      filterSpy = jest
        .spyOn(utils, 'filterFromWhitelist')
        .mockImplementation((nodes: Array<NodeDefinition<AppDeepLinkId>>, _whitelist: string[]) => {
          // Simulate that the filter keeps only alertSummaryLink
          return [alertSummaryLink];
        });
    });

    afterEach(() => {
      filterSpy.mockRestore();
    });

    it('should modify the navigation tree correctly', () => {
      const productTypes = [aiProduct];

      applyAiSocNavigation(draft, productTypes);

      // The final draft.body should be replaced by one navGroup from aiGroup
      // that has only the filtered children (we forced it to return [alertSummaryLink]).
      expect(draft.body).toEqual([
        {
          ...aiGroup,
          children: [alertSummaryLink],
        },
      ]);

      // Check that filterFromWhitelist was called with the original children plus alertSummaryLink
      const securityGroup = getSampleDraft().body[0] as WritableDraft<
        GroupDefinition<AppDeepLinkId, string, string>
      >;
      const originalChildren = securityGroup.children;
      const expectedChildrenForFiltering = [...originalChildren, alertSummaryLink];

      expect(filterSpy).toHaveBeenCalledWith(expectedChildrenForFiltering, expect.any(Array));
    });
  });
});
