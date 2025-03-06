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

import { moveToAnotherSection, filterFromWhitelist } from './utils';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';

describe('AI SOC utils (Original Tests)', () => {
  describe('moveToAnotherSection', () => {
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

    it('should find and remove nodes with specified IDs', () => {
      const idsToAttach = ['attack_discovery', 'cases'];
      const result = moveToAnotherSection(nodes, idsToAttach);
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
      expect(nodes).toEqual([
        {
          breadcrumbStatus: 'hidden',
          children: [],
        },
      ]);
    });

    it('should handle empty nodes array', () => {
      const result = moveToAnotherSection([], ['cases']);
      expect(result).toEqual([]);
    });

    it('should handle empty idsToAttach array', () => {
      const result = moveToAnotherSection(nodes, []);
      expect(result).toEqual([]);
    });
  });

  describe('moveToAnotherSection - Larger Dataset', () => {
    let bigNodes: Array<NodeDefinition<AppDeepLinkId>>;

    beforeEach(() => {
      // Fresh copy before each test to avoid mutation carry-over
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

    it('should move a single node from a deeply nested structure', () => {
      const idsToAttach = ['fleet:settings'];
      const result = moveToAnotherSection(bigNodes, idsToAttach);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual('fleet:settings');

      // Confirm it is removed from original bigNodes
      const hasRemovedNode = JSON.stringify(bigNodes).includes('fleet:settings');
      expect(hasRemovedNode).toBe(false);
    });

    it('should move multiple nodes at different levels', () => {
      const idsToAttach = ['cases', 'fleet:agents', 'management:securityAiAssistantManagement'];
      const result = moveToAnotherSection(bigNodes, idsToAttach);

      expect(result.map((r) => r.id)).toEqual([
        'cases',
        'fleet:agents',
        'management:securityAiAssistantManagement',
      ]);

      const leftoverIds = JSON.stringify(bigNodes);
      expect(leftoverIds).not.toContain('cases');
      expect(leftoverIds).not.toContain('fleet:agents');
      expect(leftoverIds).not.toContain('management:securityAiAssistantManagement');
    });

    it('should handle no matches found in nested structure', () => {
      const idsToAttach = ['not_existing', 'also_unknown'];
      const result = moveToAnotherSection(bigNodes, idsToAttach);
      expect(result).toEqual([]);
      // bigNodes should remain unchanged.
      expect(bigNodes).toHaveLength(5);
    });

    it('should handle partial overlap of existing and non-existing IDs', () => {
      const idsToAttach = ['cases_configure', 'random'];
      const result = moveToAnotherSection(bigNodes, idsToAttach);

      // Only one real match
      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual('cases_configure');

      // Confirm removal
      expect(JSON.stringify(bigNodes)).not.toContain('cases_configure');
    });
  });
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
