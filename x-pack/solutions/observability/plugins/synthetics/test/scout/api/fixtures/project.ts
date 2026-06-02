/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';

const projectBase = (project: string, spaceId?: string) =>
  `${spaceId ? `s/${spaceId}/` : ''}api/synthetics/project/${project}/monitors`;

type ProjectMonitor = Record<string, unknown>;

/**
 * Assigns a fresh `id` to every project monitor and forces them onto the given
 * private location(s). Mirrors the `setUniqueIds` helpers used across the FTR
 * project-monitor suites so re-runs don't collide on stable journey ids.
 */
export const setUniqueIds = (
  monitors: ReadonlyArray<Readonly<ProjectMonitor>>,
  { privateLocations = [] as string[] }: { privateLocations?: string[] } = {}
): ProjectMonitor[] =>
  monitors.map((monitor) => ({
    ...monitor,
    id: uuidv4(),
    locations: [],
    privateLocations,
  }));

/**
 * `PUT /api/synthetics/project/{project}/monitors/_bulk_update` — pushes a set
 * of project monitors. Mirrors `SyntheticsMonitorTestService.addProjectMonitors`;
 * the caller supplies the auth headers (the internal origin lets the versioned
 * public route resolve without an explicit `elastic-api-version`).
 */
export async function pushProjectMonitors(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  project: string,
  monitors: unknown[],
  opts: { spaceId?: string; statusCode?: number } = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.put(`${projectBase(project, spaceId)}/_bulk_update`, {
    headers,
    body: { monitors },
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/**
 * `GET /api/synthetics/project/{project}/monitors` — lists project monitors.
 */
export async function getProjectMonitors(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  project: string,
  opts: { spaceId?: string; query?: string; statusCode?: number } = {}
) {
  const { spaceId, query = '', statusCode = 200 } = opts;
  const res = await apiClient.get(`${projectBase(project, spaceId)}${query ? `?${query}` : ''}`, {
    headers,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/**
 * `DELETE /api/synthetics/project/{project}/monitors/_bulk_delete` with a
 * `{ monitors: [journeyId, ...] }` body.
 */
export async function deleteProjectMonitors(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  project: string,
  monitorIds: string[],
  opts: { spaceId?: string; statusCode?: number } = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.delete(`${projectBase(project, spaceId)}/_bulk_delete`, {
    headers,
    body: { monitors: monitorIds },
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}
