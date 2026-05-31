/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import {
  buildEpicRef,
  buildRelationshipDocumentId,
  buildRelationshipEdgesFromProjectItem,
  buildTeamRepositoryEdges,
  dedupeRelationshipEdges,
} from './build_relationships';

describe('build_relationships', () => {
  it('builds on_board and child_of edges for a ticket under an epic', () => {
    const edges = buildRelationshipEdgesFromProjectItem({
      projectItemId: 'PVT_item1',
      projectNumber: 705,
      orgLogin: 'elastic',
      ticketType: 'Feature',
      epicKey: 'My Epic',
      contentRef: {
        type: 'Issue',
        repo: 'elastic/kibana',
        number: 123,
      },
    });

    expect(edges).toEqual(
      expect.arrayContaining([
        {
          from: 'project_item:PVT_item1',
          to: 'issue:elastic/kibana#123',
          relation: 'on_board',
          metadata: {
            project_number: 705,
            scope: 'project',
            org: 'elastic',
          },
        },
        {
          from: 'issue:elastic/kibana#123',
          to: buildEpicRef(705, 'My Epic'),
          relation: 'child_of',
          metadata: {
            project_number: 705,
            scope: 'project',
            org: 'elastic',
            epic_key: 'My Epic',
          },
        },
        {
          from: buildEpicRef(705, 'My Epic'),
          to: 'issue:elastic/kibana#123',
          relation: 'parent_of',
          metadata: {
            project_number: 705,
            scope: 'project',
            org: 'elastic',
            epic_key: 'My Epic',
          },
        },
      ])
    );
  });

  it('builds tracked_as edge for epic project items', () => {
    const edges = buildRelationshipEdgesFromProjectItem({
      projectItemId: 'PVT_epic',
      projectNumber: 705,
      ticketType: 'Epic',
      epicKey: 'My Epic',
      contentRef: {
        type: 'Issue',
        repo: 'elastic/kibana',
        number: 1,
      },
    });

    expect(edges).toEqual(
      expect.arrayContaining([
        {
          from: buildEpicRef(705, 'My Epic'),
          to: 'issue:elastic/kibana#1',
          relation: 'tracked_as',
          metadata: {
            project_number: 705,
            scope: 'project',
            epic_key: 'My Epic',
          },
        },
      ])
    );
    expect(edges.some((edge) => edge.relation === 'child_of')).toBe(false);
  });

  it('builds pull request refs for PR board items', () => {
    const edges = buildRelationshipEdgesFromProjectItem({
      projectItemId: 'PVT_pr',
      projectNumber: 705,
      ticketType: 'Feature',
      epicKey: 'My Epic',
      contentRef: {
        type: 'PullRequest',
        repo: 'elastic/kibana',
        number: 99,
      },
    });

    expect(edges.some((edge) => edge.to === 'pr:elastic/kibana#99')).toBe(true);
  });

  it('builds team owns_repo edges', () => {
    const edges = buildTeamRepositoryEdges({
      slug: 'security-analytics',
      orgLogin: 'elastic',
      repositories: ['elastic/kibana', 'elastic/security-docs'],
    });

    expect(edges).toHaveLength(2);
    expect(edges[0]).toMatchObject({
      from: 'team:security-analytics',
      to: 'repo:elastic/kibana',
      relation: 'owns_repo',
      metadata: {
        scope: 'org_catalog',
        team_slug: 'security-analytics',
        org: 'elastic',
      },
    });
  });

  it('dedupes edges by document id', () => {
    const edge = {
      from: 'issue:elastic/kibana#1',
      to: buildEpicRef(705, 'Epic'),
      relation: 'child_of',
    };
    const deduped = dedupeRelationshipEdges([edge, edge]);
    expect(deduped).toHaveLength(1);
    expect(buildRelationshipDocumentId(edge.from, edge.relation, edge.to)).toContain('edge:');
  });
});
