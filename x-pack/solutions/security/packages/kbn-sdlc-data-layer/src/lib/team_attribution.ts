/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import {
  BARE_TEAM_LABEL_NORMALIZATION,
  ENGINEERING_TEAM_LABEL_NORMALIZATION,
  TEAM_DIMENSION_SEED,
  type TeamDimensionRecord,
} from '../config/team_dimension';

export interface TeamAttribution {
  readonly engineeringTeam?: string;
  readonly orgTeams: readonly string[];
  readonly attributionSource: string;
}

export const normalizeTeamLabel = (label: string): string =>
  ENGINEERING_TEAM_LABEL_NORMALIZATION[label] ?? label;

const toCanonicalTeamPrefixedLabel = (label: string): string | undefined => {
  if (label.startsWith('Team:')) {
    return normalizeTeamLabel(label);
  }

  if (/^team:/i.test(label)) {
    return normalizeTeamLabel(`Team:${label.replace(/^team:\s?/i, '')}`);
  }

  return undefined;
};

export const canonicalTeamLabel = (label: string): string | undefined => {
  const teamPrefixed = toCanonicalTeamPrefixedLabel(label);
  if (teamPrefixed) {
    return teamPrefixed;
  }

  const fromBare = BARE_TEAM_LABEL_NORMALIZATION[label];
  return fromBare ? normalizeTeamLabel(fromBare) : undefined;
};

const buildLookup = (): {
  byProjectTeam: Map<string, string[]>;
  byLabel: Map<string, string[]>;
  bySlug: Map<string, string[]>;
} => {
  const byProjectTeam = new Map<string, string[]>();
  const byLabel = new Map<string, string[]>();
  const bySlug = new Map<string, string[]>();

  for (const record of TEAM_DIMENSION_SEED) {
    const orgKey = record.org_team.key;
    for (const value of record.aliases.project_team_values) {
      const existing = byProjectTeam.get(value) ?? [];
      byProjectTeam.set(value, [...existing, orgKey]);
    }
    for (const label of record.aliases.github_labels) {
      const normalized = normalizeTeamLabel(label);
      const existing = byLabel.get(normalized) ?? [];
      byLabel.set(normalized, [...existing, orgKey]);
    }
    for (const slug of record.aliases.github_org_slugs) {
      const existing = bySlug.get(slug) ?? [];
      bySlug.set(slug, [...existing, orgKey]);
    }
  }

  return { byProjectTeam, byLabel, bySlug };
};

const LOOKUP = buildLookup();

export const resolveOrgTeamsFromProjectTeam = (projectTeam: string | undefined): string[] => {
  if (!projectTeam) {
    return [];
  }
  return LOOKUP.byProjectTeam.get(projectTeam) ?? [];
};

export const resolveOrgTeamsFromLabels = (labels: readonly string[] | undefined): string[] => {
  if (!labels?.length) {
    return [];
  }
  const orgTeams = new Set<string>();
  for (const label of labels) {
    const canonical = canonicalTeamLabel(label);
    if (canonical) {
      const matches = LOOKUP.byLabel.get(canonical) ?? [];
      for (const match of matches) {
        orgTeams.add(match);
      }
    }

    for (const match of LOOKUP.byProjectTeam.get(label) ?? []) {
      orgTeams.add(match);
    }
  }
  return [...orgTeams];
};

export const resolveContributingOrgTeams = ({
  projectTeam,
  labels,
}: {
  projectTeam?: string;
  labels?: readonly string[];
}): readonly string[] => {
  const orgTeams = new Set<string>();
  for (const orgTeam of resolveOrgTeamsFromProjectTeam(projectTeam)) {
    orgTeams.add(orgTeam);
  }
  for (const orgTeam of resolveOrgTeamsFromLabels(labels)) {
    orgTeams.add(orgTeam);
  }
  return [...orgTeams];
};

export const attributeTeam = ({
  projectTeam,
  labels,
}: {
  projectTeam?: string;
  labels?: readonly string[];
}): TeamAttribution => {
  const fromProject = resolveOrgTeamsFromProjectTeam(projectTeam);
  if (projectTeam && fromProject.length) {
    return {
      engineeringTeam: projectTeam,
      orgTeams: fromProject,
      attributionSource: 'project_field',
    };
  }

  const fromLabels = resolveOrgTeamsFromLabels(labels);
  if (fromLabels.length) {
    const engineeringTeam = labels?.reduce<string | undefined>((resolved, label) => {
      if (resolved) {
        return resolved;
      }
      if (label.startsWith('Team:') || /^team:/i.test(label)) {
        return label.replace(/^team:\s?/i, '').replace(/^Team:\s?/, '');
      }
      if (BARE_TEAM_LABEL_NORMALIZATION[label]) {
        return label;
      }
      if (resolveOrgTeamsFromProjectTeam(label).length > 0) {
        return label;
      }
      return undefined;
    }, undefined);
    return {
      engineeringTeam,
      orgTeams: fromLabels,
      attributionSource: 'github_label',
    };
  }

  if (projectTeam) {
    return {
      engineeringTeam: projectTeam,
      orgTeams: [],
      attributionSource: 'project_field_unmapped',
    };
  }

  return { orgTeams: [], attributionSource: 'unknown' };
};

export const getTeamDimensionDocumentId = (record: TeamDimensionRecord): string =>
  `org-team:${record.org_team.key}`;

export const teamDimensionToBulkDocuments = (): Array<{ id: string; doc: TeamDimensionRecord }> =>
  TEAM_DIMENSION_SEED.map((record) => ({
    id: getTeamDimensionDocumentId(record),
    doc: record,
  }));

export const getTeamDimensionRecords = (): readonly TeamDimensionRecord[] => TEAM_DIMENSION_SEED;
