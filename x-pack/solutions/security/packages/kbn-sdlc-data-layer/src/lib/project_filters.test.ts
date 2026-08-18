/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { filterGithubProjects, resolveGithubProjectsToSync } from './project_filters';

const PROJECTS = [
  { number: 705, title: 'Security Roadmap 2025', url: 'https://github.com/orgs/elastic/projects/705' },
  { number: 100, title: 'Platform Backlog', url: 'https://github.com/orgs/elastic/projects/100' },
  { number: 200, title: 'Security Experiments', url: 'https://github.com/orgs/elastic/projects/200' },
];

describe('filterGithubProjects', () => {
  it('returns all projects when no filters are set', () => {
    expect(filterGithubProjects(PROJECTS)).toEqual(PROJECTS);
  });

  it('includes only whitelisted project numbers', () => {
    expect(
      filterGithubProjects(PROJECTS, {
        includeProjectNumbers: [705, 200],
      })
    ).toEqual([PROJECTS[0], PROJECTS[2]]);
  });

  it('excludes project numbers and title patterns', () => {
    expect(
      filterGithubProjects(PROJECTS, {
        excludeProjectNumbers: [100],
        titleIncludes: ['security'],
      })
    ).toEqual([PROJECTS[0], PROJECTS[2]]);
  });

  it('excludes projects whose titles match exclude patterns', () => {
    expect(
      filterGithubProjects(PROJECTS, {
        titleExcludes: ['experiments'],
      })
    ).toEqual([PROJECTS[0], PROJECTS[1]]);
  });
});

describe('resolveGithubProjectsToSync', () => {
  it('uses explicit project numbers without discovery when no filters are set', () => {
    expect(
      resolveGithubProjectsToSync({
        explicitProjectNumbers: [705],
        discoveredProjects: PROJECTS,
      })
    ).toEqual([{ number: 705, title: '' }]);
  });

  it('discovers all org projects when explicit list is empty', () => {
    expect(
      resolveGithubProjectsToSync({
        explicitProjectNumbers: [],
        discoveredProjects: PROJECTS,
      })
    ).toEqual(PROJECTS);
  });

  it('intersects explicit numbers with discovery metadata for title filters', () => {
    expect(
      resolveGithubProjectsToSync({
        explicitProjectNumbers: [705, 100],
        discoveredProjects: PROJECTS,
        filters: { titleIncludes: ['roadmap'] },
      })
    ).toEqual([PROJECTS[0]]);
  });
});
