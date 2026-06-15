/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Matches the roadmap label column in the contribution matrix table. */
export const TEAMS_MATRIX_ROADMAP_COLUMN_WIDTH = '160px';

export const getTeamsMatrixGridTemplateColumns = (teamCount: number): string =>
  `${TEAMS_MATRIX_ROADMAP_COLUMN_WIDTH} repeat(${Math.max(teamCount, 1)}, minmax(0, 1fr))`;

export const getTeamsMatrixTeamColumnWidth = (teamCount: number): string =>
  `calc((100% - ${TEAMS_MATRIX_ROADMAP_COLUMN_WIDTH}) / ${Math.max(teamCount, 1)})`;
