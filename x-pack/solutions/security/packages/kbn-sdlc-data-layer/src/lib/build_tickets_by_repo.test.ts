/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import {
  buildTicketsByRepo,
  collectEpicGithubAssignees,
  extractEpicLinks,
  resolveEpicOwner,
  resolveEpicTitle,
  resolveTicketStatus,
} from './build_tickets_by_repo';

describe('build_tickets_by_repo', () => {
  it('groups tickets by repo and attaches PR refs from the same repo', () => {
    const result = buildTicketsByRepo(
      [
        {
          repo: 'elastic/kibana',
          number: 11201,
          title: 'Workflow fetch PRs',
          state: 'CLOSED',
          projectStatus: 'Done',
        },
        {
          repo: 'elastic/kibana',
          number: 11210,
          title: 'Phase health dashboard',
          state: 'OPEN',
          projectStatus: 'In Progress',
        },
        {
          repo: 'elastic/sdlc-platform',
          number: 101,
          title: 'CI ingest workflow',
          state: 'OPEN',
          projectStatus: 'Open',
        },
      ],
      [
        { repo: 'elastic/kibana', number: 8831 },
        { repo: 'elastic/kibana', number: 8901 },
        { repo: 'elastic/sdlc-platform', number: 201 },
      ]
    );

    expect(result).toEqual([
      {
        repo: 'elastic/kibana',
        items: [
          {
            issueRef: '#11201',
            number: 11201,
            title: 'Workflow fetch PRs',
            status: 'closed',
            prRefs: ['#PR-8831', '#PR-8901'],
          },
          {
            issueRef: '#11210',
            number: 11210,
            title: 'Phase health dashboard',
            status: 'in-progress',
            prRefs: ['#PR-8831', '#PR-8901'],
          },
        ],
      },
      {
        repo: 'elastic/sdlc-platform',
        items: [
          {
            issueRef: '#101',
            number: 101,
            title: 'CI ingest workflow',
            status: 'open',
            prRefs: ['#PR-201'],
          },
        ],
      },
    ]);
  });

  it('resolves ticket status from project status and github state', () => {
    expect(
      resolveTicketStatus({
        repo: 'elastic/kibana',
        number: 1,
        title: 't',
        state: 'OPEN',
        projectStatus: 'Review',
      })
    ).toBe('in-progress');
    expect(
      resolveTicketStatus({
        repo: 'elastic/kibana',
        number: 2,
        title: 't',
        state: 'CLOSED',
      })
    ).toBe('closed');
  });

  it('extracts epic links and metadata from project fields', () => {
    expect(
      extractEpicLinks({
        projectUrl: 'https://github.com/orgs/elastic/projects/705',
        fields: {
          'PRD URL': 'https://docs.example/prd',
          'Architecture URL': 'https://docs.example/arch',
        },
      })
    ).toEqual({
      project_url: 'https://github.com/orgs/elastic/projects/705',
      prd_url: 'https://docs.example/prd',
      arch_url: 'https://docs.example/arch',
    });

    expect(
      resolveEpicTitle({
        epicKey: 'My Epic',
        anchorTitle: 'Phase A — engineering core',
        fields: { Epic: 'My Epic' },
      })
    ).toBe('Phase A — engineering core');

    expect(resolveEpicOwner({ fields: { Owner: 'Y. Naumenko' } })).toBe('Y. Naumenko');
    expect(
      resolveEpicOwner({
        fields: {},
        githubAssignees: ['yuliianaumenko', 'dev2'],
      })
    ).toBe('yuliianaumenko');
    expect(
      resolveEpicOwner({
        fields: { Owner: 'Y. Naumenko' },
        githubAssignees: ['other-user'],
      })
    ).toBe('Y. Naumenko');
    expect(
      collectEpicGithubAssignees({
        anchorAssignees: ['anchor-dev'],
        childIssues: [{ assignees: ['child-dev'] }, { assignees: ['anchor-dev'] }],
      })
    ).toEqual(['anchor-dev', 'child-dev']);
  });
});
