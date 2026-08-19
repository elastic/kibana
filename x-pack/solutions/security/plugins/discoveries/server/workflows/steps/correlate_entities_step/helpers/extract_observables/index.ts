/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryObservableEntity } from '../../../../../../common/step_types/shared_schemas';
import {
  OBSERVABLE_TYPE_AGENT_ID,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
} from '../../../../../../common/observable_types';

// Mirrors the Cases auto-extraction rule set
// (x-pack/platform/plugins/shared/cases/common/observables/get_observables_from_ecs.ts)
// https://www.elastic.co/docs/reference/ecs/ecs-hash
const HASH_FIELDS = [
  'cdhash',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'ssdeep',
  'tlsh',
] as const;

const HASH_PARENTS = ['dll', 'file', 'process'] as const;

const HASH_FIELD_PATHS = HASH_PARENTS.flatMap((parent) =>
  HASH_FIELDS.map((field) => `${parent}.hash.${field}`)
);

const getIpTypeKey = (ip: string): string =>
  ip.includes(':') ? OBSERVABLE_TYPE_IPV6 : OBSERVABLE_TYPE_IPV4;

/**
 * Resolves a dotted ECS field path against an alert `_source` document,
 * supporting both nested objects (`{ source: { ip: '…' } }`), flattened dotted
 * keys (`{ 'source.ip': '…' }`), and arrays at any level. Returns all
 * non-empty string values.
 */
export const getFieldStringValues = (source: unknown, path: string): string[] => {
  const resolve = (value: unknown, segments: string[]): unknown[] => {
    if (Array.isArray(value)) {
      return value.flatMap((item) => resolve(item, segments));
    }

    if (segments.length === 0) {
      return [value];
    }

    if (value == null || typeof value !== 'object') {
      return [];
    }

    const record = value as Record<string, unknown>;
    const results: unknown[] = [];
    const joined = segments.join('.');

    if (joined in record) {
      results.push(...resolve(record[joined], []));
    }

    if (segments.length > 1 && segments[0] in record) {
      results.push(...resolve(record[segments[0]], segments.slice(1)));
    }

    return results;
  };

  return resolve(source, path.split('.')).filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
};

/**
 * Extracts non-entity observables from alert `_source` documents using the
 * Cases auto-extraction rule set (IPs, hostnames, file hashes, file paths,
 * domains, agent ids). Values in `excludeValues` (e.g. host names that
 * matched an Entity Store entity) are skipped for the hostname rule so a
 * matched entity is not re-reported as a plain observable. Results are
 * deduplicated by `type_key` + `value`.
 */
export const extractObservables = ({
  excludeValues = new Set<string>(),
  sources,
}: {
  excludeValues?: Set<string>;
  sources: Array<Record<string, unknown>>;
}): AttackDiscoveryObservableEntity[] => {
  const observablesMap = new Map<string, AttackDiscoveryObservableEntity>();

  const addObservable = (typeKey: string, value: string) => {
    const key = `${typeKey}:${value}`;

    if (!observablesMap.has(key)) {
      observablesMap.set(key, { type_key: typeKey, value });
    }
  };

  for (const source of sources) {
    for (const ip of getFieldStringValues(source, 'source.ip')) {
      addObservable(getIpTypeKey(ip), ip);
    }

    for (const ip of getFieldStringValues(source, 'destination.ip')) {
      addObservable(getIpTypeKey(ip), ip);
    }

    for (const hostname of getFieldStringValues(source, 'host.name')) {
      if (!excludeValues.has(hostname)) {
        addObservable(OBSERVABLE_TYPE_HOSTNAME, hostname);
      }
    }

    for (const hashFieldPath of HASH_FIELD_PATHS) {
      for (const hash of getFieldStringValues(source, hashFieldPath)) {
        addObservable(OBSERVABLE_TYPE_FILE_HASH, hash);
      }
    }

    for (const filePath of getFieldStringValues(source, 'file.path')) {
      addObservable(OBSERVABLE_TYPE_FILE_PATH, filePath);
    }

    for (const domain of getFieldStringValues(source, 'dns.question.name')) {
      addObservable(OBSERVABLE_TYPE_DOMAIN, domain);
    }

    for (const agentId of getFieldStringValues(source, 'agent.id')) {
      addObservable(OBSERVABLE_TYPE_AGENT_ID, agentId);
    }
  }

  return Array.from(observablesMap.values());
};
