/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER } from './workflows_deck_epic_correlation';

export interface GitHubProjectLink {
  readonly number: number;
  readonly title?: string;
  readonly url: string;
  readonly view_number?: number;
}

export interface SubteamDefinition {
  readonly name: string;
  readonly project_team_values?: readonly string[];
  readonly github_labels?: readonly string[];
  readonly github_org_slugs?: readonly string[];
  readonly github_projects?: readonly GitHubProjectLink[];
}

export const slugifySubteamKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildGithubTeamUrl = (orgSlug: string): string =>
  `https://github.com/orgs/elastic/teams/${orgSlug}`;

export const buildGithubProjectViewUrl = ({
  projectNumber,
  viewNumber,
}: {
  projectNumber: number;
  viewNumber?: number;
}): string =>
  viewNumber === undefined
    ? `https://github.com/orgs/elastic/projects/${projectNumber}`
    : `https://github.com/orgs/elastic/projects/${projectNumber}/views/${viewNumber}`;

/** Per–org-team subteam metadata (engineering teams, GitHub links, planning boards). */
export const ORG_TEAM_SUBTEAM_DEFINITIONS: Readonly<Record<string, readonly SubteamDefinition[]>> =
  {
    siem: [
      {
        name: 'One Workflow',
        project_team_values: ['One Workflow'],
        github_labels: ['Team:One Workflow'],
        github_org_slugs: ['one-workflow'],
        github_projects: [
          {
            number: WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
            title: 'Security Roadmap (Workflows view)',
            url: buildGithubProjectViewUrl({
              projectNumber: WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
              viewNumber: 134,
            }),
            view_number: 134,
          },
        ],
      },
      {
        name: 'Core Analysis',
        project_team_values: ['Core Analysis'],
        github_labels: ['Team:Core Analysis', 'Team:Core analysis'],
        github_org_slugs: ['core-analysis'],
      },
      {
        name: 'Entity Analytics',
        project_team_values: ['Entity Analytics'],
        github_labels: ['Team:Entity Analytics'],
        github_org_slugs: ['entity-analytics'],
      },
      {
        name: 'Detection Engine',
        project_team_values: ['Detection Engine'],
        github_labels: ['Team:Detection Engine'],
      },
      {
        name: 'Rule Management',
        project_team_values: ['Rules Management', 'Detection Rule Management'],
        github_labels: ['Team:Detection Rule Management'],
      },
      {
        name: 'Threat Hunting',
        project_team_values: ['Threat Hunting'],
        github_labels: ['Team:Threat Hunting', 'Team:Threat Hunting:Investigations'],
      },
      {
        name: 'Cases',
        project_team_values: ['ResponseOps'],
        github_labels: ['Team:ResponseOps'],
      },
      {
        name: 'Contextual Security Apps',
        project_team_values: ['Contextual Security Apps'],
        github_labels: ['Team:Contextual Security'],
        github_org_slugs: ['contextual-security-apps'],
      },
    ],
    xdr: [
      {
        name: 'EDR Workflows',
        project_team_values: ['Fleet'],
        github_labels: ['Team:Defend Workflows', 'Team: EDR Workflows', 'Team:Fleet'],
        github_org_slugs: ['endpoint', 'defend'],
      },
      {
        name: 'Linux Platform',
        github_labels: ['Team:Linux Platform', 'Team:Security-Linux Platform'],
      },
      {
        name: 'Response',
        github_labels: ['Team:Endpoint Response'],
      },
      {
        name: 'Configuration Management',
        github_labels: ['Team: Endpoint Foundations'],
      },
      {
        name: 'Native Integrations',
        github_labels: ['Team:Elastic-Agent'],
      },
      {
        name: 'CI/Releases/Telemetry',
        github_labels: ['Team: Endpoint Platforms'],
      },
    ],
  };

export const resolveSubteamDefinitionsForOrg = (
  orgTeamKey: string,
  fallbackSubteamNames: readonly string[] = []
): readonly SubteamDefinition[] => {
  const configured = ORG_TEAM_SUBTEAM_DEFINITIONS[orgTeamKey];
  if (configured?.length) {
    return configured;
  }

  return fallbackSubteamNames.map((name) => ({
    name,
    project_team_values: [name],
  }));
};
