/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * under one or more contributor license agreements. Licensed under
 * the Elastic License 2.0; you may not use this file except in
 * compliance with the Elastic License 2.0.
 */

import { filterFromWhitelist } from './utils';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';

describe('AI SOC utils', () => {
  describe('filterFromWhitelist', () => {
    const nodes: Array<NodeDefinition<AppDeepLinkId>> = [
      {
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: 'attack_discovery',
            link: 'securitySolutionUI:attack_discovery',
            title: 'Attack discovery',
          },
          {
            id: 'cases',
            link: 'securitySolutionUI:cases',
            title: 'Cases',
            children: [
              {
                id: 'cases_create',
                link: 'securitySolutionUI:cases_create',
                title: 'Create',
                sideNavStatus: 'hidden',
              },
              {
                id: 'cases_configure',
                link: 'securitySolutionUI:cases_configure',
                title: 'Settings',
                sideNavStatus: 'hidden',
              },
            ],
            renderAs: 'panelOpener',
          },
        ],
      },
    ];

    it('should filter nodes based on whitelist of IDs', () => {
      const idsToAttach = ['cases', 'attack_discovery'];
      const result = filterFromWhitelist(nodes, idsToAttach);
      expect(result).toEqual([
        {
          id: 'attack_discovery',
          link: 'securitySolutionUI:attack_discovery',
          title: 'Attack discovery',
        },
        {
          id: 'cases',
          link: 'securitySolutionUI:cases',
          title: 'Cases',
          children: [
            {
              id: 'cases_create',
              link: 'securitySolutionUI:cases_create',
              title: 'Create',
              sideNavStatus: 'hidden',
            },
            {
              id: 'cases_configure',
              link: 'securitySolutionUI:cases_configure',
              title: 'Settings',
              sideNavStatus: 'hidden',
            },
          ],
          renderAs: 'panelOpener',
        },
      ]);
    });

    it('should handle empty nodes array', () => {
      const result = filterFromWhitelist([], ['cases']);
      expect(result).toEqual([]);
    });

    it('should handle empty idsToAttach array', () => {
      const result = filterFromWhitelist(nodes, []);
      expect(result).toEqual([]);
    });
  });

  describe('filterFromWhitelist - Larger Dataset', () => {
    let bigNodes: Array<NodeDefinition<AppDeepLinkId>>;

    beforeEach(() => {
      bigNodes = [
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'discover:',
              link: 'discover',
              title: 'Discover',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'attack_discovery',
              link: 'securitySolutionUI:attack_discovery',
              title: 'Attack discovery',
            },
            {
              id: 'cases',
              link: 'securitySolutionUI:cases',
              title: 'Cases',
              children: [
                {
                  id: 'cases_create',
                  link: 'securitySolutionUI:cases_create',
                  title: 'Create',
                  sideNavStatus: 'hidden',
                },
                {
                  id: 'cases_configure',
                  link: 'securitySolutionUI:cases_configure',
                  title: 'Settings',
                  sideNavStatus: 'hidden',
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'threat_intelligence',
              link: 'securitySolutionUI:threat_intelligence',
              title: 'Intelligence',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'assets',
              link: 'securitySolutionUI:assets',
              title: 'Assets',
              children: [
                {
                  id: 'fleet:',
                  link: 'fleet',
                  title: 'Fleet',
                  children: [
                    {
                      id: 'fleet:agents',
                      link: 'fleet:agents',
                      title: 'Agents',
                    },
                    {
                      id: 'fleet:policies',
                      link: 'fleet:policies',
                      title: 'Policies',
                    },
                    {
                      id: 'fleet:enrollment_tokens',
                      link: 'fleet:enrollment_tokens',
                      title: 'Enrollment tokens',
                    },
                    {
                      id: 'fleet:uninstall_tokens',
                      link: 'fleet:uninstall_tokens',
                      title: 'Uninstall tokens',
                    },
                    {
                      id: 'fleet:data_streams',
                      link: 'fleet:data_streams',
                      title: 'Data streams',
                    },
                    {
                      id: 'fleet:settings',
                      link: 'fleet:settings',
                      title: 'Settings',
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          id: 'management:securityAiAssistantManagement',
          link: 'management:securityAiAssistantManagement',
          title: 'Knowledge sources',
        },
      ];
    });

    it('should whitelist multiple nodes from deep in the structure', () => {
      const result = filterFromWhitelist(bigNodes, ['fleet:policies', 'cases_create']);
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id).sort()).toEqual(['cases_create', 'fleet:policies'].sort());
    });

    it('should preserve entire whitelisted node with children if matched directly', () => {
      const result = filterFromWhitelist(bigNodes, ['assets']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual('assets');
      expect(result[0].children).toBeDefined();
      expect(result[0].children![0].id).toEqual('fleet:');
    });

    it('should handle no matches found in nested structure', () => {
      const result = filterFromWhitelist(bigNodes, ['random1', 'random2']);
      expect(result).toEqual([]);
    });

    it('should handle partial matches plus top-level matches', () => {
      const result = filterFromWhitelist(bigNodes, ['threat_intelligence', 'fleet:data_streams']);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(
        ['fleet:data_streams', 'threat_intelligence'].sort()
      );
    });

    it('should work if we match the top-level `discover:` node plus a nested fleet child', () => {
      const result = filterFromWhitelist(bigNodes, ['discover:', 'fleet:agents']);
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id).sort()).toEqual(['discover:', 'fleet:agents'].sort());
    });
  });
});
