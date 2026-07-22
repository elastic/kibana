/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getEuidFromObject } from '../../../../../../common/domain/euid';
import { SEED_IDENTITY_PREFILTER_FIELDS, type RelatedUserBundle, type SeedEntity } from './types';

// User identities — and the `related.user` alias list this rule reads — live in
// the per-IDP `.user-*` data streams (IDP integrations reroute user docs there).
const SOURCE_INDEX_BY_NAMESPACE: Record<string, string> = {
  active_directory: 'logs-entityanalytics_ad.user-*',
  entra_id: 'logs-entityanalytics_entra_id.user-*',
  okta: 'logs-entityanalytics_okta.user-*',
};

const RELATED_USER_FIELD = 'related.user';
const OKTA_MANAGER_FIELDS = [
  'user.profile.manager',
  'entityanalytics_okta.user.profile.manager.name',
] as const;

const toStringValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toStringValues(item))
      .filter((item): item is string => item.length > 0);
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return [String(value)];
};

export const getFieldStringValues = (doc: Record<string, unknown>, field: string): string[] => {
  const flattened = doc[field];
  if (flattened !== undefined && flattened !== null && flattened !== '') {
    return toStringValues(flattened);
  }

  const parts = field.split('.');
  let current: unknown = doc;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return [];
    }
    current = (current as Record<string, unknown>)[part];
  }
  return toStringValues(current);
};

const buildIdentityPrefilter = (seed: SeedEntity): QueryDslQueryContainer[] => {
  const source = seed.source;
  const should: QueryDslQueryContainer[] = [];

  for (const field of SEED_IDENTITY_PREFILTER_FIELDS) {
    const values = getFieldStringValues(source, field);
    if (values.length > 0) {
      should.push({ terms: { [field]: values } });
    }
  }

  return should;
};

const getSourceIndexForNamespace = (namespace: string): string | undefined =>
  SOURCE_INDEX_BY_NAMESPACE[namespace];

export const readRelatedUserBundleForSeed = async ({
  esClient,
  seed,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  seed: SeedEntity;
  abortSignal: AbortSignal;
}): Promise<RelatedUserBundle | undefined> => {
  const index = getSourceIndexForNamespace(seed.namespace);
  if (!index) {
    return undefined;
  }

  const identityPrefilterClauses = buildIdentityPrefilter(seed);
  if (identityPrefilterClauses.length === 0) {
    return undefined;
  }

  const response = await esClient.search<Record<string, unknown>>(
    {
      index,
      size: 10,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          should: identityPrefilterClauses,
          minimum_should_match: 1,
        },
      },
    },
    { signal: abortSignal }
  );

  const matchingHit = response.hits.hits.find((hit) => {
    const source = hit._source;
    if (!source) {
      return false;
    }
    return getEuidFromObject('user', source) === seed.entityId;
  });

  const source = matchingHit?._source;
  if (!source) {
    return undefined;
  }

  return {
    relatedUsers: getFieldStringValues(source, RELATED_USER_FIELD),
    excludedValues: OKTA_MANAGER_FIELDS.flatMap((field) => getFieldStringValues(source, field)),
  };
};
