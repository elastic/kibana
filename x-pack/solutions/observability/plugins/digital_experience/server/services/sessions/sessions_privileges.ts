/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityFieldSecurity,
  SecurityIndicesPrivileges,
  SecurityUserIndicesPrivileges,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { escapeRegExp } from 'lodash';
import { SESSIONS_INDEX_PATTERN, SESSIONS_SOURCE_INDICES } from '../../../common/sessions';
import { SessionsPrivilegesError } from './sessions_privileges_error';
import { SessionsRestrictedReadError } from './sessions_restricted_read_error';

/**
 * What the summaries task does with the API key granted on the user's behalf: read the events with
 * ES|QL, and write the summaries. Kibana's internal user puts the index template.
 */
export const REQUIRED_SOURCE_INDEX_PRIVILEGES = ['read', 'view_index_metadata'] as const;
export const REQUIRED_DEST_INDEX_PRIVILEGES = [
  'read',
  'view_index_metadata',
  'index',
  'create_index',
] as const;

export const getMissingSessionsPrivileges = async (
  client: ElasticsearchClient,
  { isServerless }: { isServerless: boolean }
): Promise<string[]> => {
  const response = await client.security.hasPrivileges({
    // On Serverless, checking the source read for document- and field-level security reads the
    // user's roles, which needs `read_security`.
    cluster: isServerless ? ['read_security'] : [],
    index: [
      { names: [...SESSIONS_SOURCE_INDICES], privileges: [...REQUIRED_SOURCE_INDEX_PRIVILEGES] },
      { names: [SESSIONS_INDEX_PATTERN], privileges: [...REQUIRED_DEST_INDEX_PRIVILEGES] },
    ],
  });
  if (response.has_all_requested) {
    return [];
  }
  const missingCluster = Object.entries(response.cluster)
    .filter(([, granted]) => !granted)
    .map(([privilege]) => `cluster:${privilege}`);
  const missingIndex = Object.entries(response.index).flatMap(([index, privileges]) =>
    Object.entries(privileges)
      .filter(([, granted]) => !granted)
      .map(([privilege]) => `index:${index}:${privilege}`)
  );
  return [...missingCluster, ...missingIndex];
};

const READ_PRIVILEGES = new Set(['read', 'all']);
/** Index privileges known not to read documents. Any other, such as an action pattern, may. */
const NON_READ_PRIVILEGES = new Set([
  'view_index_metadata',
  'read_view_metadata',
  'monitor',
  'manage',
  'maintenance',
  'auto_configure',
  'create_index',
  'delete_index',
  'create',
  'create_doc',
  'index',
  'delete',
  'write',
]);

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Whether an index pattern from a role covers `pattern`: only the role's `*` may absorb the
 * pattern's own `*`, read literally, as `?` and plain characters match one character of a name.
 * Regular expression names (`/.../`) never count.
 */
export const indexPatternCovers = (rolePattern: string, pattern: string): boolean => {
  if (rolePattern.startsWith('/')) {
    return false;
  }
  const regex = rolePattern
    .split('')
    .map((char) => (char === '*' ? '.*' : char === '?' ? '[^*]' : escapeRegExp(char)))
    .join('');
  return new RegExp(`^${regex}$`).test(pattern);
};

/**
 * Whether some index name could match both an index pattern from a role and `pattern`. Regular
 * expression names (`/.../`) always could, as proving otherwise isn't practical.
 */
export const indexPatternsOverlap = (rolePattern: string, pattern: string): boolean => {
  if (rolePattern.startsWith('/')) {
    return true;
  }
  const memo = new Map<number, boolean>();
  const overlap = (i: number, j: number): boolean => {
    const key = i * (pattern.length + 1) + j;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = overlapFrom(i, j);
    memo.set(key, result);
    return result;
  };
  // A `*` matches nothing, or one more character of the other pattern (which may be its `*`).
  const overlapFrom = (i: number, j: number): boolean => {
    if (rolePattern[i] === '*') {
      return overlap(i + 1, j) || (j < pattern.length && overlap(i, j + 1));
    }
    if (pattern[j] === '*') {
      return overlap(i, j + 1) || (i < rolePattern.length && overlap(i + 1, j));
    }
    if (i === rolePattern.length || j === pattern.length) {
      return i === rolePattern.length && j === pattern.length;
    }
    const [roleChar, char] = [rolePattern[i], pattern[j]];
    return (roleChar === char || roleChar === '?' || char === '?') && overlap(i + 1, j + 1);
  };
  return overlap(0, 0);
};

/** Index privileges as the user privileges API reports them, or as a role defines them. */
type IndexPrivileges = SecurityUserIndicesPrivileges | SecurityIndicesPrivileges;

const grantsAllFields = (
  fieldSecurity: SecurityFieldSecurity | SecurityFieldSecurity[] | undefined
): boolean => {
  const grants = asArray(fieldSecurity);
  return (
    grants.length === 0 ||
    grants.some(({ grant, except }) => asArray(grant).includes('*') && asArray(except).length === 0)
  );
};

const grantsRead = (entry: IndexPrivileges): boolean =>
  entry.privileges.some((privilege) => READ_PRIVILEGES.has(privilege));

const isFiltered = (entry: IndexPrivileges): boolean =>
  asArray(entry.query).length > 0 || !grantsAllFields(entry.field_security);

const isUnrestrictedReadOf = (entry: IndexPrivileges, pattern: string): boolean =>
  grantsRead(entry) &&
  !isFiltered(entry) &&
  asArray(entry.names).some((name) => indexPatternCovers(name, pattern));

const mayGrantRead = (entry: IndexPrivileges): boolean =>
  entry.privileges.some((privilege) => !NON_READ_PRIVILEGES.has(privilege));

const mayFilterReadOf = (entry: IndexPrivileges, pattern: string): boolean =>
  mayGrantRead(entry) &&
  isFiltered(entry) &&
  asArray(entry.names).some((name) => indexPatternsOverlap(name, pattern));

/**
 * Index privileges of the user's roles, or `undefined` for an API key, whose own role descriptors
 * no role holds. Uses the Query Role API, which unlike the Get Role API also returns predefined
 * roles on Serverless. Needs `read_security`, which enabling checks first on Serverless.
 */
const getRoleIndexPrivileges = async (
  client: ElasticsearchClient
): Promise<IndexPrivileges[] | undefined> => {
  const { roles, authentication_type: authenticationType } = await client.security.authenticate();
  if (authenticationType === 'api_key') {
    return undefined;
  }
  if (roles.length === 0) {
    return [];
  }
  const { roles: descriptors } = await client.security.queryRole({
    query: { terms: { name: roles } },
    size: roles.length,
  });
  return descriptors.flatMap(({ indices }) => indices ?? []);
};

/** The user's index privileges, or `undefined` when Elasticsearch can't report them. */
const getIndexPrivileges = async (
  client: ElasticsearchClient
): Promise<IndexPrivileges[] | undefined> => {
  try {
    const { indices } = await client.security.getUserPrivileges();
    return indices;
  } catch (error) {
    // API keys with their own role descriptors: Elasticsearch answers 400 instead of privileges.
    if (isResponseError(error) && error.statusCode === 400) {
      return undefined;
    }
    // Serverless only lets operator users call it (410), so read the user's roles instead.
    if (isResponseError(error) && error.statusCode === 410) {
      return getRoleIndexPrivileges(client);
    }
    throw error;
  }
};

/**
 * Source index patterns the user may not read in full: some role's read that could apply there is
 * filtered by document- or field-level security, and no role provably reads all of it.
 * Elasticsearch merges the user's roles per index pattern, so one role with unrestricted read on a
 * pattern lifts another role's filter there. `has_privileges` checks the read itself, which also
 * covers regular expression names; those can't prove unrestricted read here.
 */
export const getRestrictedSourceIndices = async (
  client: ElasticsearchClient
): Promise<{ indices: string[]; reason: 'filtered' | 'unverifiable' }> => {
  const entries = await getIndexPrivileges(client);
  if (entries === undefined) {
    return { indices: [...SESSIONS_SOURCE_INDICES], reason: 'unverifiable' };
  }
  return {
    indices: SESSIONS_SOURCE_INDICES.filter(
      (pattern) =>
        entries.some((entry) => mayFilterReadOf(entry, pattern)) &&
        !entries.some((entry) => isUnrestrictedReadOf(entry, pattern))
    ),
    reason: 'filtered',
  };
};

/**
 * Throws unless the user can set sessions up: the privileges the summaries task needs, and
 * unrestricted reads of the source data, as every reader of the summaries sees what it read. Runs
 * as the user, as an API key with role descriptors can't answer the read check.
 */
export const checkSessionsPrivileges = async (
  client: ElasticsearchClient,
  { isServerless }: { isServerless: boolean }
): Promise<void> => {
  const missingPrivileges = await getMissingSessionsPrivileges(client, { isServerless });
  if (missingPrivileges.length > 0) {
    throw new SessionsPrivilegesError(missingPrivileges);
  }
  // `has_privileges` doesn't see document- or field-level security, so check it separately.
  const restricted = await getRestrictedSourceIndices(client);
  if (restricted.indices.length > 0) {
    throw new SessionsRestrictedReadError(restricted.indices, restricted.reason);
  }
};
