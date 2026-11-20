/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';

export interface LibraryRelease {
  id: string;
  // Unset for a library that has not been synced, which has no rules to show.
  version?: string;
}

/**
 * Matches the rules each library has now: the ones that were saved with the release the library is at. A rule
 * is saved with the release of every sync that reads it, so the older versions of a rule, and the rules an
 * earlier release had and a later one dropped, are left out without any grouping by rule.
 */
export const buildLibraryReleaseFilter = (
  libraries: readonly LibraryRelease[]
): QueryDslQueryContainer => ({
  bool: {
    should: libraries.flatMap(({ id, version }) =>
      version
        ? [
            {
              bool: {
                filter: [
                  { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id`]: id } },
                  { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.library_version`]: version } },
                ],
              },
            },
          ]
        : []
    ),
    minimum_should_match: 1,
  },
});

export const hasSyncedLibrary = (libraries: readonly LibraryRelease[]): boolean =>
  libraries.some(({ version }) => Boolean(version));
