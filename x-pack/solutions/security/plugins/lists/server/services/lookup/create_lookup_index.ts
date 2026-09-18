/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { ErrorWithStatusCode } from '../../error_with_status_code';

import { buildLookupMappings } from './build_lookup_mappings';

/**
 * Creates the per-list lookup-mode index for a value list together with its alias, in
 * one create call so both exist or neither does. Single shard is implied by
 * `index.mode: lookup`.
 *
 * Both names derive from a normalized list id, and normalization is lossy, so two
 * different ids can map to the same names. A name that already exists therefore
 * belongs to another list, and reusing it would merge two lists into one index.
 * The create fails with 409 instead.
 */
export const createLookupIndex = async ({
  esClient,
  index,
  alias,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  alias: string;
  type: Type;
}): Promise<void> => {
  const [indexExists, aliasExists] = await Promise.all([
    esClient.indices.exists({ index }),
    esClient.indices.exists({ index: alias }),
  ]);
  const taken = indexExists ? index : aliasExists ? alias : undefined;
  if (taken != null) {
    throw new ErrorWithStatusCode(
      `"${taken}" already exists. The list id normalizes to a name another list or index uses; choose a different id`,
      409
    );
  }
  await esClient.indices.create({
    aliases: { [alias]: {} },
    index,
    mappings: buildLookupMappings(type),
    settings: { index: { mode: 'lookup' } },
  });
};

/** Points the alias at the index. Used to un-restrict a list. Fails with 409 if the name is taken. */
export const addLookupAlias = async ({
  esClient,
  index,
  alias,
}: {
  esClient: ElasticsearchClient;
  index: string;
  alias: string;
}): Promise<void> => {
  const aliasExists = await esClient.indices.exists({ index: alias });
  if (aliasExists) {
    const current = await esClient.indices.getAlias({ name: alias }).catch(() => ({}));
    if (!(index in current)) {
      throw new ErrorWithStatusCode(`"${alias}" already exists and is not this list's alias`, 409);
    }
    return;
  }
  await esClient.indices.updateAliases({ actions: [{ add: { alias, index } }] });
};

/** Removes the alias from the index. Used to restrict a list. A missing alias is not an error. */
export const removeLookupAlias = async ({
  esClient,
  index,
  alias,
}: {
  esClient: ElasticsearchClient;
  index: string;
  alias: string;
}): Promise<void> => {
  await esClient.indices
    .updateAliases({ actions: [{ remove: { alias, index } }] })
    .catch((err: { meta?: { statusCode?: number } }) => {
      if (err?.meta?.statusCode === 404) return;
      throw err;
    });
};
