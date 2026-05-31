/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TeamAccent {
  readonly background: string;
  readonly color: string;
  readonly icon: string;
}

const TEAM_ACCENTS: Record<string, TeamAccent> = {
  siem: { background: '#EEEDFE', color: '#3C3489', icon: 'securitySignal' },
  si: { background: '#E6F1FB', color: '#0C447C', icon: 'machineLearningApp' },
  sde: { background: '#E1F5EE', color: '#085041', icon: 'database' },
  xdr: { background: '#FAECE7', color: '#712B13', icon: 'compute' },
  pds: { background: '#FAEEDA', color: '#633806', icon: 'launch' },
};

const DEFAULT_ACCENT: TeamAccent = {
  background: '#F1EFE8',
  color: '#444441',
  icon: 'users',
};

export const getTeamAccent = (teamKey: string): TeamAccent =>
  TEAM_ACCENTS[teamKey] ?? DEFAULT_ACCENT;

export const getRoadmapAccentColor = (roadmapId: string): string => {
  const colors = ['#534AB7', '#0F6E56', '#854F0B', '#993C1D'];
  const hash = roadmapId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
