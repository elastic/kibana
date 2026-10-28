/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isIndexExclusion, splitRemoteCluster } from '../../../../../common/remote_cluster';
import { compileGlob } from './index_glob';

/** A role's index grants, reduced to what the coverage check reads. */
export interface WorkerRoleDescriptor {
  indices: Array<{ names: string[]; privileges: string[] }>;
  remoteIndices: Array<{ names: string[]; privileges: string[]; clusters: string[] }>;
}

const READ_PRIVILEGES = ['read', 'all'];

/**
 * Whether `rolePattern` covers every name `candidate` can match. Both are `*`-only globs, so
 * each `*` in the candidate is replaced by a character no role pattern contains: the candidate
 * is covered exactly when the role pattern still matches, because every candidate `*` can then
 * only be absorbed by a `*` of the role pattern. Used for index parts and cluster aliases.
 */
export const patternCovers = (rolePattern: string, candidate: string): boolean =>
  compileGlob(rolePattern).test(candidate.replace(/\*/g, '\u0001'));

const hasReadPrivilege = (privileges: string[]): boolean =>
  privileges.some((privilege) => READ_PRIVILEGES.includes(privilege));

const coveredByLocal = (role: WorkerRoleDescriptor, index: string): boolean =>
  role.indices.some(
    ({ names, privileges }) =>
      hasReadPrivilege(privileges) && names.some((name) => patternCovers(name, index))
  );

/**
 * The positive patterns the role does not let its holder read. On Serverless the project
 * qualifier is ignored: a `<project>:<index>` expression is authorized against the local role
 * of the linked project, so only the index part is matched. On stateful, a remote pattern needs
 * a `remote_indices` entry for its cluster. A `::` selector stays in the index part and is
 * reported uncovered, since the role grants `read`, not `read_failure_store`.
 *
 * Known limitation: a cross-cluster API key's `access` and the remote cluster's own copy of the
 * role are not visible from here, so a remote pattern can read as covered when the key
 * excludes it. The last sweep's own output is the exact answer once one has run.
 */
export const uncoveredPatterns = ({
  role,
  patterns,
  isServerless,
}: {
  role: WorkerRoleDescriptor;
  patterns: string[];
  isServerless: boolean;
}): string[] =>
  patterns.filter((pattern) => {
    if (isIndexExclusion(pattern)) return false;
    const { cluster, index } = splitRemoteCluster(pattern);
    if (index.includes('::')) return true;
    if (isServerless || cluster === undefined) return !coveredByLocal(role, index);
    return !role.remoteIndices.some(
      ({ clusters, names, privileges }) =>
        hasReadPrivilege(privileges) &&
        clusters.some((entryCluster) => patternCovers(entryCluster, cluster)) &&
        names.some((name) => patternCovers(name, index))
    );
  });

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

interface RawIndexEntry {
  names?: string | string[];
  privileges?: string[];
  clusters?: string | string[];
}

interface RawRole {
  indices?: RawIndexEntry[];
  remote_indices?: RawIndexEntry[];
}

const normalizeRole = ({ indices = [], remote_indices: remoteIndices = [] }: RawRole) => ({
  indices: indices.map(({ names, privileges }) => ({
    names: toArray(names),
    privileges: privileges ?? [],
  })),
  remoteIndices: remoteIndices.map(({ names, privileges, clusters }) => ({
    names: toArray(names),
    privileges: privileges ?? [],
    clusters: toArray(clusters),
  })),
});

/** The HTTP status of an Elasticsearch client error, read from either place the client puts it. */
export const statusCodeOf = (error: unknown): number | undefined => {
  const { statusCode, meta } = (error ?? {}) as {
    statusCode?: number;
    meta?: { statusCode?: number };
  };
  return statusCode ?? meta?.statusCode;
};

/** Whether an Elasticsearch client error is a 403 or 404 (role unreadable or absent). */
export const isRoleUnreadableError = (error: unknown): boolean => {
  const status = statusCodeOf(error);
  return status === 403 || status === 404;
};

/**
 * Reads a role the way Kibana's own role route does: `getRole` on stateful, `queryRole` on
 * Serverless. Both need `read_security`. Returns `undefined` when the role is not there or the
 * caller may not read it (403/404); any other error is rethrown.
 */
export const readWorkerRole = async ({
  esClient,
  roleName,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  roleName: string;
  isServerless: boolean;
}): Promise<WorkerRoleDescriptor | undefined> => {
  try {
    if (isServerless) {
      const { roles } = await esClient.security.queryRole({
        query: { term: { name: roleName } },
        size: 1,
      });
      const [role] = roles as RawRole[];
      return role ? normalizeRole(role) : undefined;
    }
    const roles = (await esClient.security.getRole({ name: roleName })) as Record<string, RawRole>;
    const role = roles[roleName];
    return role ? normalizeRole(role) : undefined;
  } catch (err) {
    if (isRoleUnreadableError(err)) return undefined;
    throw err;
  }
};
